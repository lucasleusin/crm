const _ = require('lodash');
const { uid } = require('@nocobase/utils');
const { initEnv, generateAppDir } = require('@nocobase/cli/src/util');
const { Application, runPluginStaticImports } = require('@nocobase/server');
const { getConfig } = require('@nocobase/app/lib/config');
const {
  oneTableBlockWithAddNewAndViewAndEditAndBasicFields,
} = require('/app/node_modules/@nocobase/test/lib/e2e/templatesOfPage.js');
const {
  schemaToRoutes,
} = require('/app/node_modules/@nocobase/plugin-client/dist/server/migrations/2024122912211-transform-menu-schema-to-routes.js');

const DATA_SOURCE_KEY = 'main';
const ROOT_MENU_TITLE = 'CRM';

const PAGE_DEFS = [
  {
    title: 'Organizations',
    icon: 'bankoutlined',
    collection: 'crm_organizations',
    columns: ['organization_name', 'org_type', 'contacts_summary', 'website', 'market', 'source'],
    createFields: ['organization_name', 'country', 'org_type', 'sports', 'website', 'market', 'source', 'head_office', 'instagram', 'comments'],
    editFields: ['organization_name', 'country', 'org_type', 'sports', 'website', 'market', 'source', 'head_office', 'instagram', 'comments'],
  },
  {
    title: 'Jobs',
    icon: 'profileoutlined',
    collection: 'crm_jobs',
    columns: ['job_name', 'contact', 'organization', 'status', 'location', 'deadline'],
    createFields: ['job_name', 'contact', 'status', 'location', 'deadline', 'pay', 'job_description_link', 'notes', 'my_strategy'],
    editFields: ['job_name', 'contact', 'status', 'location', 'deadline', 'pay', 'job_description_link', 'notes', 'my_strategy'],
  },
  {
    title: 'Connections',
    icon: 'teamoutlined',
    collection: 'crm_connections',
    columns: ['connection_date', 'contact', 'organization', 'connection_status', 'relationship_level', 'role'],
    createFields: ['contact', 'connection_date', 'connection_status', 'relationship_level', 'role', 'notes', 'action_items', 'action_items_status', 'source', 'stay_connected'],
    editFields: ['contact', 'connection_date', 'connection_status', 'relationship_level', 'role', 'notes', 'action_items', 'action_items_status', 'source', 'stay_connected'],
  },
];

function schemaTypeForField(field) {
  if (!field) {
    return 'string';
  }
  if (field.type === 'belongsTo') {
    return 'object';
  }
  if (field.type === 'belongsToMany') {
    return 'array';
  }
  if (['integer', 'bigInt', 'float', 'double', 'decimal'].includes(field.type)) {
    return 'number';
  }
  if (field.type === 'boolean') {
    return 'boolean';
  }
  return 'string';
}

function humanize(name) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildScalarField(columnName, fieldType) {
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
    uiSchema,
  };
}

function buildBelongsToField(spec) {
  return {
    name: spec.fieldName,
    type: 'belongsTo',
    interface: 'm2o',
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

function buildHasManyField(spec) {
  return {
    name: spec.fieldName,
    type: 'hasMany',
    interface: 'o2m',
    target: spec.targetCollection,
    foreignKey: spec.foreignKey,
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

const FOREIGN_KEY_SPECS = [
  {
    table: 'crm_contacts',
    column: 'organization_id',
    constraintName: 'fk_crm_contacts_organization_id',
    referencedTable: 'crm_organizations',
    onDelete: 'SET NULL',
  },
  {
    table: 'crm_jobs',
    column: 'contact_id',
    constraintName: 'fk_crm_jobs_contact_id',
    referencedTable: 'crm_contacts',
    onDelete: 'SET NULL',
  },
  {
    table: 'crm_jobs',
    column: 'organization_id',
    constraintName: 'fk_crm_jobs_organization_id',
    referencedTable: 'crm_organizations',
    onDelete: 'SET NULL',
  },
  {
    table: 'crm_connections',
    column: 'contact_id',
    constraintName: 'fk_crm_connections_contact_id',
    referencedTable: 'crm_contacts',
    onDelete: 'SET NULL',
  },
  {
    table: 'crm_connections',
    column: 'organization_id',
    constraintName: 'fk_crm_connections_organization_id',
    referencedTable: 'crm_organizations',
    onDelete: 'SET NULL',
  },
  {
    table: 'crm_organizations',
    column: 'org_type_id',
    constraintName: 'fk_crm_organizations_org_type_id',
    referencedTable: 'crm_org_types',
    onDelete: 'SET NULL',
  },
  {
    table: 'crm_organizations_org_types',
    column: 'organization_id',
    constraintName: 'fk_crm_organizations_org_types_organization_id',
    referencedTable: 'crm_organizations',
    onDelete: 'CASCADE',
  },
  {
    table: 'crm_organizations_org_types',
    column: 'org_type_id',
    constraintName: 'fk_crm_organizations_org_types_org_type_id',
    referencedTable: 'crm_org_types',
    onDelete: 'CASCADE',
  },
];

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

async function deleteField(app, collectionRecord, fieldName) {
  await app.db.getRepository('dataSourcesFields').destroy({
    filter: {
      name: fieldName,
      collectionName: collectionRecord.get('name'),
      dataSourceKey: DATA_SOURCE_KEY,
    },
  });
}

async function getCollectionRecord(app, name) {
  const record = await app.db.getRepository('dataSourcesCollections').findOne({
    filter: { name, dataSourceKey: DATA_SOURCE_KEY },
  });
  if (record) {
    await record.load({ app });
  }
  return record;
}

async function getFieldMap(app, collectionName) {
  const fields = await app.db.getRepository('dataSourcesFields').find({
    filter: { collectionName, dataSourceKey: DATA_SOURCE_KEY },
    sort: ['name'],
  });
  return new Map(fields.map((field) => [field.name, field]));
}

function buildFormRows(collectionName, fieldNames, fieldMap) {
  const rows = {};
  fieldNames.forEach((fieldName, index) => {
    const field = fieldMap.get(fieldName);
    if (!field) {
      throw new Error(`Missing field ${collectionName}.${fieldName}`);
    }
    rows[uid()] = {
      _isJSONSchemaObject: true,
      version: '2.0',
      type: 'void',
      'x-component': 'Grid.Row',
      properties: {
        [uid()]: {
          _isJSONSchemaObject: true,
          version: '2.0',
          type: 'void',
          'x-component': 'Grid.Col',
          properties: {
            [fieldName]: {
              _isJSONSchemaObject: true,
              version: '2.0',
              type: schemaTypeForField(field),
              'x-designer': 'FormItem.Designer',
              'x-toolbar': 'FormItemSchemaToolbar',
              'x-settings': 'fieldSettings:FormItem',
              'x-component': 'CollectionField',
              'x-decorator': 'FormItem',
              'x-collection-field': `${collectionName}.${fieldName}`,
              'x-component-props': {},
              'x-index': index + 1,
            },
          },
        },
      },
    };
  });
  return rows;
}

function buildTableColumns(collectionName, fieldNames, fieldMap, actionsNode) {
  const properties = {};
  fieldNames.forEach((fieldName, index) => {
    const field = fieldMap.get(fieldName);
    if (!field) {
      throw new Error(`Missing field ${collectionName}.${fieldName}`);
    }
    properties[uid()] = {
      _isJSONSchemaObject: true,
      version: '2.0',
      type: 'void',
      title: humanize(fieldName),
      'x-decorator': 'TableV2.Column.Decorator',
      'x-toolbar': 'TableColumnSchemaToolbar',
      'x-settings': 'fieldSettings:TableColumn',
      'x-component': 'TableV2.Column',
      properties: {
        [fieldName]: {
          _isJSONSchemaObject: true,
          version: '2.0',
          type: schemaTypeForField(field),
          'x-collection-field': `${collectionName}.${fieldName}`,
          'x-component': 'CollectionField',
          'x-component-props': {
            ellipsis: true,
          },
          'x-read-pretty': true,
          'x-decorator': null,
          'x-decorator-props': {
            labelStyle: {
              display: 'none',
            },
          },
          'x-index': 1,
        },
      },
      'x-index': index + 1,
    };
  });
  properties.actions = actionsNode;
  return properties;
}

function walk(node, visitor) {
  if (!node || typeof node !== 'object') {
    return;
  }
  visitor(node);
  if (node.properties) {
    Object.values(node.properties).forEach((child) => walk(child, visitor));
  }
}

function findOne(node, predicate) {
  let found = null;
  walk(node, (current) => {
    if (!found && predicate(current)) {
      found = current;
    }
  });
  return found;
}

function replaceCollectionStrings(node, collectionName) {
  if (Array.isArray(node)) {
    return node.map((item) => replaceCollectionStrings(item, collectionName));
  }
  if (!node || typeof node !== 'object') {
    return typeof node === 'string' ? node.replace(/\bgeneral\b/g, collectionName) : node;
  }
  const result = {};
  Object.entries(node).forEach(([key, value]) => {
    result[key] = replaceCollectionStrings(value, collectionName);
  });
  return result;
}

function stripRuntimeKeys(node) {
  if (Array.isArray(node)) {
    return node.map(stripRuntimeKeys);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }
  const result = {};
  Object.entries(node).forEach(([key, value]) => {
    if (['x-uid', 'x-index', 'x-async'].includes(key)) {
      return;
    }
    result[key] = stripRuntimeKeys(value);
  });
  return result;
}

function buildPageSchema(collectionName, columns, createFields, editFields, fieldMap) {
  const template = stripRuntimeKeys(replaceCollectionStrings(_.cloneDeep(oneTableBlockWithAddNewAndViewAndEditAndBasicFields.pageSchema), collectionName));
  const tableProvider = findOne(template, (node) => node['x-decorator'] === 'TableBlockProvider');
  const tableNode = findOne(template, (node) => node['x-component'] === 'TableV2');
  const createAction = findOne(template, (node) => node['x-action'] === 'create');
  const editAction = findOne(template, (node) => node['x-action'] === 'update' && node['x-component'] === 'Action.Link');
  const actionColumn = findOne(template, (node) => node['x-action-column'] === 'actions');
  const actionSpace = findOne(actionColumn, (node) => node['x-component'] === 'Space');
  const createForm = findOne(createAction, (node) => node['x-component'] === 'FormV2');
  const editForm = findOne(editAction, (node) => node['x-component'] === 'FormV2');

  if (!tableProvider || !tableNode || !createAction || !editAction || !actionColumn || !actionSpace || !createForm || !editForm) {
    throw new Error(`Failed to build page template for ${collectionName}`);
  }

  delete actionSpace.properties[Object.keys(actionSpace.properties).find((key) => {
    const action = actionSpace.properties[key];
    return action && action['x-action'] === 'view';
  })];

  tableProvider['x-acl-action'] = `${collectionName}:list`;
  tableProvider['x-decorator-props'] = {
    ...tableProvider['x-decorator-props'],
    collection: collectionName,
    resource: collectionName,
    action: 'list',
  };

  createAction['x-acl-action'] = 'create';
  createAction.properties.drawer.title = '{{ t("Add record") }}';
  const createFormBlock = findOne(createAction, (node) => node['x-decorator'] === 'FormBlockProvider');
  createFormBlock['x-acl-action'] = `${collectionName}:create`;
  createFormBlock['x-decorator-props'] = {
    ...createFormBlock['x-decorator-props'],
    collection: collectionName,
    resource: collectionName,
  };
  createForm.properties.grid.properties = buildFormRows(collectionName, createFields, fieldMap);

  editAction['x-acl-action'] = 'update';
  editAction.properties.drawer.title = '{{ t("Edit record") }}';
  const editFormBlock = findOne(editAction, (node) => node['x-decorator'] === 'FormBlockProvider');
  editFormBlock['x-acl-action'] = `${collectionName}:update`;
  editFormBlock['x-decorator-props'] = {
    ...editFormBlock['x-decorator-props'],
    collection: collectionName,
    resource: collectionName,
    action: 'get',
  };
  editForm.properties.grid.properties = buildFormRows(collectionName, editFields, fieldMap);

  const bulkDelete = findOne(template, (node) => node['x-action'] === 'destroy');
  if (bulkDelete) {
    bulkDelete['x-acl-action'] = `${collectionName}:destroy`;
  }

  tableNode.properties = buildTableColumns(collectionName, columns, fieldMap, actionColumn);
  return template;
}

async function ensureDataModel(app) {
  const organizations = await getCollectionRecord(app, 'crm_organizations');
  const orgTypes = await getCollectionRecord(app, 'crm_org_types');
  const contacts = await getCollectionRecord(app, 'crm_contacts');
  const jobs = await getCollectionRecord(app, 'crm_jobs');
  const connections = await getCollectionRecord(app, 'crm_connections');

  await upsertField(app, organizations, buildScalarField('contacts_summary', 'text'));
  await upsertField(
    app,
    organizations,
    buildBelongsToField({
      fieldName: 'org_type',
      fieldTitle: 'Organization type',
      targetCollection: 'crm_org_types',
      targetDisplayField: 'org_type_name',
      foreignKey: 'org_type_id',
    }),
  );
  await deleteField(app, organizations, 'org_type_id');
  await deleteField(app, organizations, 'org_types');
  await upsertField(
    app,
    orgTypes,
    buildHasManyField({
      fieldName: 'organizations',
      fieldTitle: 'Organizations',
      targetCollection: 'crm_organizations',
      targetDisplayField: 'organization_name',
      foreignKey: 'org_type_id',
    }),
  );
  await upsertField(
    app,
    contacts,
    buildBelongsToField({
      fieldName: 'organization',
      fieldTitle: 'Organization',
      targetCollection: 'crm_organizations',
      targetDisplayField: 'organization_name',
      foreignKey: 'organization_id',
    }),
  );
  await upsertField(
    app,
    jobs,
    buildBelongsToField({
      fieldName: 'contact',
      fieldTitle: 'Contact',
      targetCollection: 'crm_contacts',
      targetDisplayField: 'contact_name',
      foreignKey: 'contact_id',
    }),
  );
  await upsertField(
    app,
    jobs,
    buildBelongsToField({
      fieldName: 'organization',
      fieldTitle: 'Organization',
      targetCollection: 'crm_organizations',
      targetDisplayField: 'organization_name',
      foreignKey: 'organization_id',
    }),
  );
  await upsertField(
    app,
    connections,
    buildBelongsToField({
      fieldName: 'contact',
      fieldTitle: 'Contact',
      targetCollection: 'crm_contacts',
      targetDisplayField: 'contact_name',
      foreignKey: 'contact_id',
    }),
  );
  await upsertField(
    app,
    connections,
    buildBelongsToField({
      fieldName: 'organization',
      fieldTitle: 'Organization',
      targetCollection: 'crm_organizations',
      targetDisplayField: 'organization_name',
      foreignKey: 'organization_id',
    }),
  );

  await app.db.sync();

  const queries = [
    `
      ALTER TABLE crm_organizations
      ADD COLUMN IF NOT EXISTS org_type_id BIGINT NULL
    `,
    `
      UPDATE crm_organizations o
      LEFT JOIN (
        SELECT organization_id, MIN(org_type_id) AS org_type_id
        FROM crm_organizations_org_types
        GROUP BY organization_id
      ) rel ON rel.organization_id = o.id
      SET o.org_type_id = rel.org_type_id
      WHERE o.org_type_id IS NULL
    `,
    'DELETE FROM crm_organizations_org_types',
    `
      INSERT INTO crm_organizations_org_types (organization_id, org_type_id, createdAt, updatedAt)
      SELECT id, org_type_id, NOW(), NOW()
      FROM crm_organizations
      WHERE org_type_id IS NOT NULL
    `,
    `
      UPDATE crm_contacts c
      LEFT JOIN (
        SELECT contact_id, MIN(organization_id) AS organization_id
        FROM crm_contacts_organizations
        GROUP BY contact_id
      ) rel ON rel.contact_id = c.id
      SET c.organization_id = rel.organization_id
      WHERE c.organization_id IS NULL OR c.organization_id <> rel.organization_id
    `,
    `
      UPDATE crm_jobs j
      LEFT JOIN crm_contacts c ON c.id = j.contact_id
      SET j.organization_id = c.organization_id
      WHERE j.contact_id IS NOT NULL
    `,
    `
      UPDATE crm_connections cn
      LEFT JOIN crm_contacts c ON c.id = cn.contact_id
      SET cn.organization_id = c.organization_id
      WHERE cn.contact_id IS NOT NULL
    `,
    `
      UPDATE crm_organizations o
      LEFT JOIN (
        SELECT organization_id, GROUP_CONCAT(contact_name ORDER BY contact_name SEPARATOR '\\n') AS summary
        FROM crm_contacts
        WHERE organization_id IS NOT NULL AND COALESCE(contact_name, '') <> ''
        GROUP BY organization_id
      ) s ON s.organization_id = o.id
      SET o.contacts_summary = COALESCE(s.summary, '')
    `,
    'DROP TRIGGER IF EXISTS trg_crm_jobs_bi',
    `
      CREATE TRIGGER trg_crm_jobs_bi
      BEFORE INSERT ON crm_jobs
      FOR EACH ROW
      SET NEW.organization_id = (
        SELECT c.organization_id FROM crm_contacts c WHERE c.id = NEW.contact_id LIMIT 1
      )
    `,
    'DROP TRIGGER IF EXISTS trg_crm_jobs_bu',
    `
      CREATE TRIGGER trg_crm_jobs_bu
      BEFORE UPDATE ON crm_jobs
      FOR EACH ROW
      SET NEW.organization_id = (
        SELECT c.organization_id FROM crm_contacts c WHERE c.id = NEW.contact_id LIMIT 1
      )
    `,
    'DROP TRIGGER IF EXISTS trg_crm_connections_bi',
    `
      CREATE TRIGGER trg_crm_connections_bi
      BEFORE INSERT ON crm_connections
      FOR EACH ROW
      SET NEW.organization_id = (
        SELECT c.organization_id FROM crm_contacts c WHERE c.id = NEW.contact_id LIMIT 1
      )
    `,
    'DROP TRIGGER IF EXISTS trg_crm_connections_bu',
    `
      CREATE TRIGGER trg_crm_connections_bu
      BEFORE UPDATE ON crm_connections
      FOR EACH ROW
      SET NEW.organization_id = (
        SELECT c.organization_id FROM crm_contacts c WHERE c.id = NEW.contact_id LIMIT 1
      )
    `,
    'DROP TRIGGER IF EXISTS trg_crm_contacts_ai',
    `
      CREATE TRIGGER trg_crm_contacts_ai
      AFTER INSERT ON crm_contacts
      FOR EACH ROW
      UPDATE crm_organizations o
      SET o.contacts_summary = COALESCE((
        SELECT GROUP_CONCAT(c.contact_name ORDER BY c.contact_name SEPARATOR '\\n')
        FROM crm_contacts c
        WHERE c.organization_id = o.id AND COALESCE(c.contact_name, '') <> ''
      ), '')
      WHERE o.id = NEW.organization_id
    `,
    'DROP TRIGGER IF EXISTS trg_crm_contacts_au',
    `
      CREATE TRIGGER trg_crm_contacts_au
      AFTER UPDATE ON crm_contacts
      FOR EACH ROW
      UPDATE crm_organizations o
      SET o.contacts_summary = COALESCE((
        SELECT GROUP_CONCAT(c.contact_name ORDER BY c.contact_name SEPARATOR '\\n')
        FROM crm_contacts c
        WHERE c.organization_id = o.id AND COALESCE(c.contact_name, '') <> ''
      ), '')
      WHERE o.id IN (OLD.organization_id, NEW.organization_id)
    `,
    'DROP TRIGGER IF EXISTS trg_crm_contacts_ad',
    `
      CREATE TRIGGER trg_crm_contacts_ad
      AFTER DELETE ON crm_contacts
      FOR EACH ROW
      UPDATE crm_organizations o
      SET o.contacts_summary = COALESCE((
        SELECT GROUP_CONCAT(c.contact_name ORDER BY c.contact_name SEPARATOR '\\n')
        FROM crm_contacts c
        WHERE c.organization_id = o.id AND COALESCE(c.contact_name, '') <> ''
      ), '')
      WHERE o.id = OLD.organization_id
    `,
  ];

  for (const query of queries) {
    await app.db.sequelize.query(query);
  }

  const [existingForeignKeys] = await app.db.sequelize.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND CONSTRAINT_NAME IN (${FOREIGN_KEY_SPECS.map((spec) => `'${spec.constraintName}'`).join(', ')})
  `);
  const existingConstraintNames = new Set(existingForeignKeys.map((row) => row.CONSTRAINT_NAME));

  for (const spec of FOREIGN_KEY_SPECS) {
    if (existingConstraintNames.has(spec.constraintName)) {
      continue;
    }

    await app.db.sequelize.query(`
      ALTER TABLE ${spec.table}
      ADD CONSTRAINT ${spec.constraintName}
      FOREIGN KEY (${spec.column})
      REFERENCES ${spec.referencedTable}(id)
      ON UPDATE CASCADE
      ON DELETE ${spec.onDelete || 'SET NULL'}
    `);
  }
}

async function removeRouteSubtree(app, rootRoute) {
  const routeRepo = app.db.getRepository('desktopRoutes');
  const uiRepo = app.db.getCollection('uiSchemas').repository;
  const allRoutes = await routeRepo.find();
  const byParent = allRoutes.reduce((carry, route) => {
    const key = route.parentId || 'root';
    carry[key] = carry[key] || [];
    carry[key].push(route);
    return carry;
  }, {});

  const toDelete = [];
  const walkRoutes = (route) => {
    toDelete.push(route);
    (byParent[route.id] || []).forEach(walkRoutes);
  };
  walkRoutes(rootRoute);

  for (const route of [...toDelete].reverse()) {
    if (route.schemaUid) {
      try {
        await uiRepo.remove(route.schemaUid, {});
      } catch (error) {
        // Ignore already-removed or orphaned schema trees.
      }
    }
    await routeRepo.destroy({ filter: { id: route.id } });
  }
}

async function hideLegacyRoutes(app) {
  const routeRepo = app.db.getRepository('desktopRoutes');
  const routes = await routeRepo.find();

  const crmRoots = routes.filter((route) => route.parentId == null && route.title === ROOT_MENU_TITLE);
  for (const route of crmRoots) {
    await removeRouteSubtree(app, route);
  }

  const legacyRoots = routes.filter(
    (route) =>
      route.parentId == null &&
      ['Organizations', 'Contacts', 'Jobs', 'Connections'].includes(route.title),
  );

  for (const route of legacyRoots) {
    await routeRepo.update({
      filterByTk: route.id,
      values: {
        hideInMenu: true,
        hidden: true,
      },
    });

    const stack = [route.id];
    while (stack.length > 0) {
      const parentId = stack.pop();
      const children = routes.filter((child) => child.parentId === parentId);
      for (const child of children) {
        stack.push(child.id);
        await routeRepo.update({
          filterByTk: child.id,
          values: {
            hideInMenu: true,
            hidden: true,
          },
        });
      }
    }
  }
}

async function createRoutes(app, pageSchemas) {
  const routeRepo = app.db.getRepository('desktopRoutes');
  const roleRepo = app.db.getRepository('roles');
  const uiRepo = app.db.getCollection('uiSchemas').repository;

  const rootRoute = await routeRepo.create({
    values: {
      title: ROOT_MENU_TITLE,
      type: 'group',
      icon: 'appstoreoutlined',
      sort: 2,
      hideInMenu: false,
      hidden: false,
    },
  });

  const createdRouteIds = [rootRoute.id];

  for (const [index, pageDef] of pageSchemas.entries()) {
    const insertedPageSchema = await uiRepo.insert(pageDef.schema, {});
    const pageRoute = await routeRepo.create({
      values: {
        parentId: rootRoute.id,
        title: pageDef.title,
        type: 'page',
        icon: pageDef.icon,
        schemaUid: insertedPageSchema['x-uid'],
        sort: index + 1,
        hideInMenu: false,
        hidden: false,
        enableTabs: false,
        enableHeader: true,
        displayTitle: true,
      },
    });
    createdRouteIds.push(pageRoute.id);

    const childRoutes = await schemaToRoutes(insertedPageSchema, uiRepo);
    for (const [childIndex, childRoute] of childRoutes.entries()) {
      const createdChild = await routeRepo.create({
        values: {
          ..._.omit(childRoute, ['children']),
          parentId: pageRoute.id,
          sort: childIndex + 1,
          hidden: true,
          hideInMenu: true,
        },
      });
      createdRouteIds.push(createdChild.id);
    }
  }

  const roles = await roleRepo.find({ appends: ['desktopRoutes'] });
  for (const role of roles) {
    const assignedIds = new Set((role.desktopRoutes || []).map((route) => route.id));
    const missingIds = createdRouteIds.filter((id) => !assignedIds.has(id));
    if (missingIds.length > 0) {
      await app.db.getRepository('roles.desktopRoutes', role.name).add({ tk: missingIds });
    }
  }
}

async function main() {
  const app = await bootstrapApp();
  try {
    await ensureDataModel(app);

    const pageSchemas = [];
    for (const pageDef of PAGE_DEFS) {
      const fieldMap = await getFieldMap(app, pageDef.collection);
      pageSchemas.push({
        ...pageDef,
        schema: buildPageSchema(pageDef.collection, pageDef.columns, pageDef.createFields, pageDef.editFields, fieldMap),
      });
    }

    await hideLegacyRoutes(app);
    await createRoutes(app, pageSchemas);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
