const fs = require('fs');
const path = require('path');
const { parse } = require('@fast-csv/parse');
const { initEnv, generateAppDir } = require('@nocobase/cli/src/util');
const { Application, runPluginStaticImports } = require('@nocobase/server');
const { getConfig } = require('@nocobase/app/lib/config');

const ROOT = path.resolve(__dirname, '..');
const IMPORT_ROOT = path.join(ROOT, 'output', 'spreadsheet', 'lo_sports_consulting');
const NORMALIZED_DIR = path.join(IMPORT_ROOT, 'normalized');
const RELATIONS_PATH = path.join(IMPORT_ROOT, 'relations', 'all_relations.csv');
const REPORT_PATH = path.join(IMPORT_ROOT, 'reports', 'nocobase_import_report.json');
const DATA_SOURCE_KEY = 'main';

const COLLECTION_SPECS = [
  { name: 'crm_countries', title: 'Countries', titleField: 'country_name', keyField: 'country_key', file: 'countries.csv' },
  { name: 'crm_org_types', title: 'Organization Types', titleField: 'org_type_name', keyField: 'org_type_key', file: 'org_types.csv' },
  { name: 'crm_sports', title: 'Sports', titleField: 'sport_name', keyField: 'sport_key', file: 'sports.csv' },
  { name: 'crm_competitions', title: 'Competitions', titleField: 'competition_name', keyField: 'competition_key', file: 'competitions.csv' },
  { name: 'crm_organizations', title: 'Organizations', titleField: 'organization_name', keyField: 'organization_key', file: 'organizations.csv' },
  { name: 'crm_contacts', title: 'Contacts', titleField: 'contact_name', keyField: 'contact_key', file: 'contacts.csv' },
  { name: 'crm_jobs', title: 'Jobs', titleField: 'job_name', keyField: 'job_key', file: 'jobs.csv' },
  { name: 'crm_connections', title: 'Connections', titleField: 'connection_id', keyField: 'connection_key', file: 'connections.csv' },
  { name: 'crm_events', title: 'Events', titleField: 'event_name', keyField: 'event_key', file: 'events.csv' },
  { name: 'crm_content_calendar', title: 'Content Calendar', titleField: 'post_name', keyField: 'content_calendar_key', file: 'content_calendar.csv' },
  { name: 'crm_content_published', title: 'Content Published', titleField: 'title', keyField: 'content_published_key', file: 'content_published.csv' },
  { name: 'crm_assets', title: 'Assets', titleField: 'propriedade', keyField: 'asset_key', file: 'assets.csv' },
  { name: 'crm_activations', title: 'Activations', titleField: 'activation', keyField: 'activation_key', file: 'activations.csv' },
];

const RELATION_SPECS = [
  {
    relationName: 'organizations_to_countries',
    sourceCollection: 'crm_organizations',
    sourceKeyField: 'organization_key',
    fieldName: 'country',
    fieldTitle: 'Country',
    kind: 'belongsTo',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    foreignKey: 'country_id',
  },
  {
    relationName: 'organizations_to_org_types',
    sourceCollection: 'crm_organizations',
    sourceKeyField: 'organization_key',
    fieldName: 'org_types',
    fieldTitle: 'Organization types',
    kind: 'belongsToMany',
    targetCollection: 'crm_org_types',
    targetKeyField: 'org_type_key',
    targetDisplayField: 'org_type_name',
    through: 'crm_organizations_org_types',
    foreignKey: 'organization_id',
    otherKey: 'org_type_id',
  },
  {
    relationName: 'organizations_to_sports',
    sourceCollection: 'crm_organizations',
    sourceKeyField: 'organization_key',
    fieldName: 'sports',
    fieldTitle: 'Sports',
    kind: 'belongsToMany',
    targetCollection: 'crm_sports',
    targetKeyField: 'sport_key',
    targetDisplayField: 'sport_name',
    through: 'crm_organizations_sports',
    foreignKey: 'organization_id',
    otherKey: 'sport_id',
  },
  {
    relationName: 'organizations_to_competitions',
    sourceCollection: 'crm_organizations',
    sourceKeyField: 'organization_key',
    fieldName: 'competitions',
    fieldTitle: 'Competitions',
    kind: 'belongsToMany',
    targetCollection: 'crm_competitions',
    targetKeyField: 'competition_key',
    targetDisplayField: 'competition_name',
    through: 'crm_organizations_competitions',
    foreignKey: 'organization_id',
    otherKey: 'competition_id',
  },
  {
    relationName: 'contacts_to_organizations',
    sourceCollection: 'crm_contacts',
    sourceKeyField: 'contact_key',
    fieldName: 'organizations',
    fieldTitle: 'Organizations',
    kind: 'belongsToMany',
    targetCollection: 'crm_organizations',
    targetKeyField: 'organization_key',
    targetDisplayField: 'organization_name',
    through: 'crm_contacts_organizations',
    foreignKey: 'contact_id',
    otherKey: 'organization_id',
  },
  {
    relationName: 'contacts_to_current_country',
    sourceCollection: 'crm_contacts',
    sourceKeyField: 'contact_key',
    fieldName: 'current_country',
    fieldTitle: 'Current country',
    kind: 'belongsTo',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    foreignKey: 'current_country_id',
  },
  {
    relationName: 'contacts_to_nationality',
    sourceCollection: 'crm_contacts',
    sourceKeyField: 'contact_key',
    fieldName: 'nationalities',
    fieldTitle: 'Nationalities',
    kind: 'belongsToMany',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    through: 'crm_contacts_nationalities',
    foreignKey: 'contact_id',
    otherKey: 'country_id',
  },
  {
    relationName: 'jobs_to_organizations',
    sourceCollection: 'crm_jobs',
    sourceKeyField: 'job_key',
    fieldName: 'organization',
    fieldTitle: 'Organization',
    kind: 'belongsTo',
    targetCollection: 'crm_organizations',
    targetKeyField: 'organization_key',
    targetDisplayField: 'organization_name',
    foreignKey: 'organization_id',
  },
  {
    relationName: 'jobs_to_contacts',
    sourceCollection: 'crm_jobs',
    sourceKeyField: 'job_key',
    fieldName: 'contact',
    fieldTitle: 'Contact',
    kind: 'belongsTo',
    targetCollection: 'crm_contacts',
    targetKeyField: 'contact_key',
    targetDisplayField: 'contact_name',
    foreignKey: 'contact_id',
  },
  {
    relationName: 'connections_to_organizations',
    sourceCollection: 'crm_connections',
    sourceKeyField: 'connection_key',
    fieldName: 'organization',
    fieldTitle: 'Organization',
    kind: 'belongsTo',
    targetCollection: 'crm_organizations',
    targetKeyField: 'organization_key',
    targetDisplayField: 'organization_name',
    foreignKey: 'organization_id',
  },
  {
    relationName: 'connections_to_contacts',
    sourceCollection: 'crm_connections',
    sourceKeyField: 'connection_key',
    fieldName: 'contact',
    fieldTitle: 'Contact',
    kind: 'belongsTo',
    targetCollection: 'crm_contacts',
    targetKeyField: 'contact_key',
    targetDisplayField: 'contact_name',
    foreignKey: 'contact_id',
  },
  {
    relationName: 'connections_to_current_country',
    sourceCollection: 'crm_connections',
    sourceKeyField: 'connection_key',
    fieldName: 'current_country',
    fieldTitle: 'Current country',
    kind: 'belongsTo',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    foreignKey: 'current_country_id',
  },
  {
    relationName: 'connections_to_nationality',
    sourceCollection: 'crm_connections',
    sourceKeyField: 'connection_key',
    fieldName: 'nationalities',
    fieldTitle: 'Nationalities',
    kind: 'belongsToMany',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    through: 'crm_connections_nationalities',
    foreignKey: 'connection_id',
    otherKey: 'country_id',
  },
  {
    relationName: 'competitions_to_countries',
    sourceCollection: 'crm_competitions',
    sourceKeyField: 'competition_key',
    fieldName: 'country',
    fieldTitle: 'Country',
    kind: 'belongsTo',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    foreignKey: 'country_id',
  },
  {
    relationName: 'events_to_countries',
    sourceCollection: 'crm_events',
    sourceKeyField: 'event_key',
    fieldName: 'country',
    fieldTitle: 'Country',
    kind: 'belongsTo',
    targetCollection: 'crm_countries',
    targetKeyField: 'country_key',
    targetDisplayField: 'country_name',
    foreignKey: 'country_id',
  },
  {
    relationName: 'content_published_to_content_calendar',
    sourceCollection: 'crm_content_published',
    sourceKeyField: 'content_published_key',
    fieldName: 'content_calendars',
    fieldTitle: 'Content calendars',
    kind: 'belongsToMany',
    targetCollection: 'crm_content_calendar',
    targetKeyField: 'content_calendar_key',
    targetDisplayField: 'post_name',
    through: 'crm_content_published_content_calendars',
    foreignKey: 'content_published_id',
    otherKey: 'content_calendar_id',
  },
];

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true, ignoreEmpty: true, trim: false }))
      .on('error', reject)
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows));
  });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function humanize(name) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function inferColumnType(rows, columnName, keyField) {
  if (columnName === keyField) {
    return 'string';
  }
  const values = rows.map((row) => normalizeValue(row[columnName])).filter(Boolean);
  if (values.length > 0 && values.every((value) => /^-?\d+$/.test(value))) {
    return 'integer';
  }
  const maxLength = values.reduce((max, value) => Math.max(max, value.length), 0);
  return maxLength > 255 ? 'text' : 'string';
}

function buildScalarField(columnName, fieldType, keyField) {
  const isKey = columnName === keyField;
  const uiSchema =
    fieldType === 'integer'
      ? { type: 'number', title: humanize(columnName), 'x-component': 'InputNumber' }
      : fieldType === 'text'
        ? { type: 'string', title: humanize(columnName), 'x-component': 'Input.TextArea' }
        : { type: 'string', title: humanize(columnName), 'x-component': 'Input' };

  return {
    name: columnName,
    type: fieldType,
    interface: fieldType === 'integer' ? 'integer' : fieldType === 'text' ? 'textarea' : 'input',
    unique: isKey,
    uiSchema,
  };
}

function buildBelongsToField(spec) {
  return {
    name: spec.fieldName,
    type: 'belongsTo',
    target: spec.targetCollection,
    foreignKey: spec.foreignKey,
    targetKey: 'id',
    uiSchema: {
      type: 'object',
      title: spec.fieldTitle,
      'x-component': 'AssociationField',
      'x-component-props': {
        fieldNames: {
          label: spec.targetDisplayField,
          value: 'id',
        },
      },
    },
  };
}

function buildBelongsToManyField(spec) {
  return {
    name: spec.fieldName,
    type: 'belongsToMany',
    target: spec.targetCollection,
    through: spec.through,
    foreignKey: spec.foreignKey,
    otherKey: spec.otherKey,
    sourceKey: 'id',
    targetKey: 'id',
    uiSchema: {
      type: 'array',
      title: spec.fieldTitle,
      'x-component': 'AssociationField',
      'x-component-props': {
        multiple: true,
        fieldNames: {
          label: spec.targetDisplayField,
          value: 'id',
        },
      },
    },
  };
}

function buildRelationField(spec) {
  return spec.kind === 'belongsTo' ? buildBelongsToField(spec) : buildBelongsToManyField(spec);
}

async function upsertCollection(app, spec) {
  const repo = app.db.getRepository('dataSourcesCollections');
  const filter = { name: spec.name, dataSourceKey: DATA_SOURCE_KEY };
  let record = await repo.findOne({ filter });
  const values = {
    name: spec.name,
    dataSourceKey: DATA_SOURCE_KEY,
    title: spec.title,
    titleField: spec.titleField,
  };

  if (!record) {
    await repo.create({ values });
  } else {
    await repo.update({ filter, values });
  }

  record = await repo.findOne({ filter });
  await record.load({ app });
  return record;
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

  let record = await repo.findOne({ filter });
  if (!record) {
    await repo.create({ values });
  } else {
    await repo.update({ filter, values });
  }

  record = await repo.findOne({ filter });
  record.load({ app });
  return record;
}

async function ensureScalarSchema(app, cachedRows) {
  const summary = [];
  for (const spec of COLLECTION_SPECS) {
    const rows = cachedRows.get(spec.name) || [];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const collectionRecord = await upsertCollection(app, spec);

    for (const columnName of headers) {
      const fieldType = inferColumnType(rows, columnName, spec.keyField);
      const fieldDef = buildScalarField(columnName, fieldType, spec.keyField);
      await upsertField(app, collectionRecord, fieldDef);
    }

    summary.push({ collection: spec.name, fields: headers.length });
  }
  await app.db.sync();
  return summary;
}

async function ensureRelationSchema(app) {
  const collectionRepo = app.db.getRepository('dataSourcesCollections');
  const summary = [];
  for (const spec of RELATION_SPECS) {
    const collectionRecord = await collectionRepo.findOne({
      filter: { name: spec.sourceCollection, dataSourceKey: DATA_SOURCE_KEY },
    });
    if (!collectionRecord) {
      throw new Error(`Missing source collection: ${spec.sourceCollection}`);
    }
    await upsertField(app, collectionRecord, buildRelationField(spec));
    summary.push({ collection: spec.sourceCollection, field: spec.fieldName, kind: spec.kind });
  }
  await app.db.sync();
  return summary;
}

function coerceRowValues(row, fieldTypes) {
  const values = {};
  for (const [columnName, rawValue] of Object.entries(row)) {
    const normalized = normalizeValue(rawValue);
    if (normalized === null) {
      values[columnName] = null;
      continue;
    }
    values[columnName] = fieldTypes[columnName] === 'integer' ? Number(normalized) : normalized;
  }
  return values;
}

async function importScalarData(app, cachedRows) {
  const summary = [];
  for (const spec of COLLECTION_SPECS) {
    const rows = cachedRows.get(spec.name) || [];
    const repo = app.db.getRepository(spec.name);
    const fieldTypes = {};
    for (const columnName of Object.keys(rows[0] || {})) {
      fieldTypes[columnName] = inferColumnType(rows, columnName, spec.keyField);
    }

    let imported = 0;
    for (const row of rows) {
      await repo.updateOrCreate({
        filterKeys: [spec.keyField],
        values: coerceRowValues(row, fieldTypes),
      });
      imported += 1;
    }

    summary.push({ collection: spec.name, imported });
  }
  return summary;
}

async function buildIdLookup(app, collectionName, keyField) {
  const repo = app.db.getRepository(collectionName);
  const rows = await repo.find({ fields: ['id', keyField], paginate: false });
  const lookup = new Map();
  for (const row of rows) {
    const keyValue = row.get ? row.get(keyField) : row[keyField];
    const idValue = row.get ? row.get('id') : row.id;
    if (keyValue !== null && keyValue !== undefined) {
      lookup.set(String(keyValue), idValue);
    }
  }
  return lookup;
}

function groupMatchedRelations(rows, relationName) {
  const grouped = new Map();
  for (const row of rows) {
    if (row.relation_name !== relationName || row.status !== 'matched') {
      continue;
    }
    if (!grouped.has(row.source_key)) {
      grouped.set(row.source_key, []);
    }
    grouped.get(row.source_key).push(row.target_key);
  }
  return grouped;
}

async function applyRelations(app, relationRows) {
  const lookupCache = new Map();
  const relationSummary = [];

  for (const spec of RELATION_SPECS) {
    const sourceLookupKey = `${spec.sourceCollection}:${spec.sourceKeyField}`;
    const targetLookupKey = `${spec.targetCollection}:${spec.targetKeyField}`;

    if (!lookupCache.has(sourceLookupKey)) {
      lookupCache.set(sourceLookupKey, await buildIdLookup(app, spec.sourceCollection, spec.sourceKeyField));
    }
    if (!lookupCache.has(targetLookupKey)) {
      lookupCache.set(targetLookupKey, await buildIdLookup(app, spec.targetCollection, spec.targetKeyField));
    }

    const sourceLookup = lookupCache.get(sourceLookupKey);
    const targetLookup = lookupCache.get(targetLookupKey);
    const grouped = groupMatchedRelations(relationRows, spec.relationName);
    const repo = app.db.getRepository(spec.sourceCollection);
    let applied = 0;

    for (const [sourceKey, targetKeys] of grouped.entries()) {
      const sourceId = sourceLookup.get(sourceKey);
      if (!sourceId) {
        continue;
      }
      const targetIds = [...new Set(targetKeys.map((targetKey) => targetLookup.get(targetKey)).filter(Boolean))];
      if (spec.kind === 'belongsTo') {
        if (targetIds[0]) {
          await repo.relation(spec.fieldName).of(sourceId).set(targetIds[0]);
          applied += 1;
        }
      } else if (targetIds.length > 0) {
        await repo.relation(spec.fieldName).of(sourceId).set(targetIds);
        applied += 1;
      }
    }

    relationSummary.push({ relation: spec.relationName, applied });
  }

  return relationSummary;
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

async function main() {
  const startedAt = new Date().toISOString();
  const cachedRows = new Map();
  for (const spec of COLLECTION_SPECS) {
    const filePath = path.join(NORMALIZED_DIR, spec.file);
    cachedRows.set(spec.name, await readCsv(filePath));
  }
  const relationRows = await readCsv(RELATIONS_PATH);

  let app;
  try {
    app = await bootstrapApp();
    const schemaSummary = await ensureScalarSchema(app, cachedRows);
    const relationSchemaSummary = await ensureRelationSchema(app);
    const dataSummary = await importScalarData(app, cachedRows);
    const relationSummary = await applyRelations(app, relationRows);

    const report = {
      startedAt,
      finishedAt: new Date().toISOString(),
      schemaSummary,
      relationSchemaSummary,
      dataSummary,
      relationSummary,
    };
    writeJson(REPORT_PATH, report);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (app) {
      await app.destroy({ logging: false });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
