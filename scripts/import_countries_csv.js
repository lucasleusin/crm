const fs = require('fs');
const path = require('path');
const { parse } = require('@fast-csv/parse');
const { uid } = require('@nocobase/utils');
const { initEnv, generateAppDir } = require('@nocobase/cli/src/util');
const { Application, runPluginStaticImports } = require('@nocobase/server');
const { getConfig } = require('@nocobase/app/lib/config');

const DATA_SOURCE_KEY = 'main';
const COLLECTION_SPEC = {
  name: 'crm_countries',
  title: 'Countries',
  titleField: 'country_name',
  keyField: 'country_key',
};
const SELECT_FIELD_OPTIONS = {
  continent: [
    'Africa',
    'Antarctica',
    'Asia',
    'Europe',
    'North America',
    'Oceania',
    'South America',
  ],
  region: [
    'Africa',
    'Antarctica',
    'Asia',
    'Caribbean',
    'Central America',
    'Europe',
    'Middle East',
    'North America',
    'Oceania',
    'South America',
    'Unknown',
  ],
};

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function humanize(name) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildScalarField(columnName) {
  const selectOptions = SELECT_FIELD_OPTIONS[columnName];
  const optionItems = selectOptions
    ? selectOptions.map((value) => ({
        label: value,
        value,
      }))
    : null;

  return {
    name: columnName,
    type: 'string',
    interface: selectOptions ? 'select' : 'input',
    unique: columnName === COLLECTION_SPEC.keyField,
    uiSchema: {
      type: 'string',
      title: humanize(columnName),
      'x-component': selectOptions ? 'Select' : 'Input',
      ...(selectOptions
        ? {
            enum: optionItems,
            'x-component-props': {
              options: optionItems,
            },
          }
        : {}),
    },
  };
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true, ignoreEmpty: true, trim: true }))
      .on('error', reject)
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows));
  });
}

function normalizeRows(rows) {
  const seenKeys = new Map();
  return rows.map((row) => {
    const countryName = normalizeValue(row.Country);
    const baseKey = `country--${slugify(countryName)}`;
    const occurrence = (seenKeys.get(baseKey) || 0) + 1;
    seenKeys.set(baseKey, occurrence);

    return {
      country_key: occurrence === 1 ? baseKey : `${baseKey}-${occurrence}`,
      country_name: countryName,
      capital_city: normalizeValue(row['Capital City']),
      continent: normalizeValue(row.Continent),
      region: normalizeValue(row.Region),
    };
  });
}

async function bootstrapApp() {
  initEnv();
  generateAppDir();
  await runPluginStaticImports();
  const config = await getConfig();
  const app = new Application({
    ...config,
    name: 'main',
    skipSupervisor: true,
  });
  await app.load({ sync: true });
  return app;
}

async function upsertCollection(app) {
  const repo = app.db.getRepository('dataSourcesCollections');
  const filter = { name: COLLECTION_SPEC.name, dataSourceKey: DATA_SOURCE_KEY };
  const values = {
    ...COLLECTION_SPEC,
    dataSourceKey: DATA_SOURCE_KEY,
  };

  const existing = await repo.findOne({ filter });
  if (existing) {
    await repo.update({ filter, values });
  } else {
    await repo.create({ values });
  }

  const record = await repo.findOne({ filter });
  await record.load({ app });
  return record;
}

async function upsertLegacyCollection(app) {
  const repo = app.db.getRepository('collections');
  const filter = { name: COLLECTION_SPEC.name };
  const values = {
    name: COLLECTION_SPEC.name,
    title: 'Countries',
    inherit: false,
    hidden: false,
    options: {
      titleField: COLLECTION_SPEC.titleField,
      from: 'db2cm',
    },
    description: null,
    sort: 100,
  };

  const existing = await repo.findOne({ filter });
  if (existing) {
    await repo.update({ filter, values });
    return existing;
  }

  return repo.create({
    values: {
      key: uid(),
      ...values,
    },
  });
}

async function upsertField(app, collectionRecord, fieldDef) {
  const repo = app.db.getRepository('dataSourcesFields');
  const filter = {
    name: fieldDef.name,
    collectionName: collectionRecord.get('name'),
    dataSourceKey: DATA_SOURCE_KEY,
  };
  const values = {
    ...fieldDef,
    collectionName: collectionRecord.get('name'),
    dataSourceKey: DATA_SOURCE_KEY,
    collectionKey: collectionRecord.get('key'),
  };

  const existing = await repo.findOne({ filter });
  if (existing) {
    await repo.update({ filter, values });
  } else {
    await repo.create({ values });
  }
}

async function upsertLegacyField(app, fieldDef, sort) {
  const repo = app.db.getRepository('fields');
  const filter = {
    collectionName: COLLECTION_SPEC.name,
    name: fieldDef.name,
  };
  const values = {
    name: fieldDef.name,
    type: fieldDef.type,
    interface: fieldDef.interface,
    description: null,
    collectionName: COLLECTION_SPEC.name,
    parentKey: null,
    reverseKey: null,
    options: {
      unique: fieldDef.unique || false,
      uiSchema: fieldDef.uiSchema,
      ...(SELECT_FIELD_OPTIONS[fieldDef.name]
        ? {
            enum: SELECT_FIELD_OPTIONS[fieldDef.name].map((value) => ({
              label: value,
              value,
            })),
          }
        : {}),
    },
    sort,
  };

  const existing = await repo.findOne({ filter });
  if (existing) {
    await repo.update({ filter, values });
    return;
  }

  await repo.create({
    values: {
      key: uid(),
      ...values,
    },
  });
}

async function ensureSchema(app) {
  const collectionRecord = await upsertCollection(app);
  await upsertLegacyCollection(app);
  const fieldNames = ['country_key', 'country_name', 'capital_city', 'continent', 'region'];
  for (const [index, fieldName] of fieldNames.entries()) {
    const fieldDef = buildScalarField(fieldName);
    await upsertLegacyField(app, fieldDef, index + 1);
    await upsertField(app, collectionRecord, buildScalarField(fieldName));
  }
  await app.db.sync();
}

async function importRows(app, rows) {
  const repo = app.db.getRepository(COLLECTION_SPEC.name);
  let imported = 0;
  for (const row of rows) {
    await repo.updateOrCreate({
      filterKeys: [COLLECTION_SPEC.keyField],
      values: row,
    });
    imported += 1;
  }
  return imported;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('Usage: node scripts/import_countries_csv.js <csv-path>');
  }

  const rows = normalizeRows(await readCsv(path.resolve(inputPath)));
  const uniqueKeys = new Set(rows.map((row) => row.country_key));
  if (uniqueKeys.size !== rows.length) {
    throw new Error('Duplicate country_key values found in the CSV.');
  }

  const app = await bootstrapApp();
  try {
    await ensureSchema(app);
    const imported = await importRows(app, rows);
    console.log(
      JSON.stringify(
        {
          collection: COLLECTION_SPEC.name,
          imported,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
