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
const ROOT_MENU_TITLE = 'Admin';
const CONTINENT_OPTIONS = ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];

const PAGE_DEFS = [
  {
    title: 'Countries',
    icon: 'globaloutlined',
    collection: 'crm_countries',
    collectionDisplayName: 'Countries',
    columns: ['country_name', 'capital_city', 'continent', 'region'],
    createFields: ['country_name', 'capital_city', 'continent', 'region'],
    editFields: ['country_name', 'capital_city', 'continent', 'region'],
    countriesFilterForm: true,
  },
  {
    title: 'Org Types',
    icon: 'tagsoutlined',
    collection: 'crm_org_types',
    collectionDisplayName: 'Org Types',
    columns: ['org_type_name', 'org_group'],
    createFields: ['org_type_name', 'org_group'],
    editFields: ['org_type_name', 'org_group'],
  },
  {
    title: 'Sports',
    icon: 'trophyoutlined',
    collection: 'crm_sports',
    collectionDisplayName: 'Sports',
    columns: ['sport_name', 'sport_type'],
    createFields: ['sport_name', 'sport_type'],
    editFields: ['sport_name', 'sport_type'],
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
  const template = stripRuntimeKeys(
    replaceCollectionStrings(_.cloneDeep(oneTableBlockWithAddNewAndViewAndEditAndBasicFields.pageSchema), collectionName),
  );
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

  delete actionSpace.properties[
    Object.keys(actionSpace.properties).find((key) => {
      const action = actionSpace.properties[key];
      return action && action['x-action'] === 'view';
    })
  ];

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

function buildFilterActionBar() {
  return {
    _isJSONSchemaObject: true,
    version: '2.0',
    type: 'void',
    'x-initializer': 'filterForm:configureActions',
    'x-component': 'ActionBar',
    'x-component-props': {
      layout: 'one-column',
      style: {
        float: 'right',
      },
    },
    properties: {
      [uid()]: {
        _isJSONSchemaObject: true,
        version: '2.0',
        type: 'void',
        title: '{{ t("Filter records") }}',
        'x-action': 'submit',
        'x-component': 'Action',
        'x-designer': 'Action.Designer',
        'x-component-props': {
          type: 'primary',
          useProps: '{{ useFilterBlockActionProps }}',
        },
      },
      [uid()]: {
        _isJSONSchemaObject: true,
        version: '2.0',
        type: 'void',
        title: '{{ t("Reset records") }}',
        'x-component': 'Action',
        'x-designer': 'Action.Designer',
        'x-component-props': {
          useProps: '{{ useResetBlockActionProps }}',
        },
      },
    },
  };
}

function buildFilterFormFieldSchema(collectionName, fieldName, title, component, componentProps, extra = {}) {
  return {
    _isJSONSchemaObject: true,
    version: '2.0',
    type: 'string',
    title,
    required: false,
    'x-designer': 'FormItem.FilterFormDesigner',
    'x-toolbar': 'FormItemSchemaToolbar',
    'x-settings': 'fieldSettings:FilterFormItem',
    'x-component': component,
    'x-decorator': 'FormItem',
    'x-use-decorator-props': 'useFormItemProps',
    'x-collection-field': `${collectionName}.${fieldName}`,
    'x-component-props': componentProps,
    ...extra,
  };
}

function buildCountriesFilterFormSchema(collectionName) {
  const countryNameField = buildFilterFormFieldSchema(
    collectionName,
    'country_name',
    'Country Name',
    'Input.Search',
    {
      allowClear: true,
      placeholder: 'Search country name',
    },
    {
      'x-filter-operators': [
        {
          label: 'contains',
          value: '$includes',
          selected: true,
        },
      ],
    },
  );

  const continentField = buildFilterFormFieldSchema(
    collectionName,
    'continent',
    'Continent',
    'Select',
    {
      allowClear: true,
      placeholder: 'All continents',
    },
    {
      enum: CONTINENT_OPTIONS.map((value) => ({
        label: value,
        value,
      })),
      'x-filter-operators': [
        {
          label: 'is',
          value: '$eq',
          selected: true,
        },
      ],
    },
  );

  return {
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
          [uid()]: {
            _isJSONSchemaObject: true,
            version: '2.0',
            type: 'void',
            'x-decorator': 'FilterFormBlockProvider',
            'x-use-decorator-props': 'useFilterFormBlockDecoratorProps',
            'x-decorator-props': {
              dataSource: DATA_SOURCE_KEY,
              collection: collectionName,
            },
            'x-toolbar': 'BlockSchemaToolbar',
            'x-settings': 'blockSettings:filterForm',
            'x-component': 'CardItem',
            'x-filter-targets': [],
            properties: {
              [uid()]: {
                _isJSONSchemaObject: true,
                version: '2.0',
                type: 'void',
                'x-component': 'FormV2',
                'x-use-component-props': 'useFilterFormBlockProps',
                properties: {
                  grid: {
                    _isJSONSchemaObject: true,
                    version: '2.0',
                    type: 'void',
                    'x-component': 'Grid',
                    'x-initializer': 'filterForm:configureFields',
                    properties: {
                      [uid()]: {
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
                              country_name: countryNameField,
                            },
                          },
                          [uid()]: {
                            _isJSONSchemaObject: true,
                            version: '2.0',
                            type: 'void',
                            'x-component': 'Grid.Col',
                            properties: {
                              continent: continentField,
                            },
                          },
                        },
                      },
                    },
                  },
                  actions: buildFilterActionBar(),
                },
              },
            },
          },
        },
      },
    },
  };
}

function addCountriesFilterForm(pageSchema, collectionName) {
  const pageGrid = findOne(pageSchema, (node) => node['x-component'] === 'Grid' && node['x-initializer'] === 'page:addBlock');
  if (!pageGrid) {
    throw new Error(`Failed to locate page grid for ${collectionName}`);
  }

  const existingEntries = Object.entries(pageGrid.properties || {});
  const newProperties = {
    [uid()]: buildCountriesFilterFormSchema(collectionName),
  };

  for (const [key, value] of existingEntries) {
    newProperties[key] = value;
  }

  pageGrid.properties = newProperties;
}

async function ensureCollectionTitles(app) {
  const repo = app.db.getRepository('dataSourcesCollections');
  for (const pageDef of PAGE_DEFS) {
    const record = await getCollectionRecord(app, pageDef.collection);
    if (!record) {
      throw new Error(`Missing collection ${pageDef.collection}`);
    }
    await repo.update({
      filter: {
        name: pageDef.collection,
        dataSourceKey: DATA_SOURCE_KEY,
      },
      values: {
        title: pageDef.collectionDisplayName,
      },
    });
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
        // Ignore orphaned schema records.
      }
    }
    await routeRepo.destroy({ filter: { id: route.id } });
  }
}

async function resetAdminRoutes(app) {
  const routeRepo = app.db.getRepository('desktopRoutes');
  const routes = await routeRepo.find();
  const adminRoots = routes.filter((route) => route.parentId == null && route.title === ROOT_MENU_TITLE);
  for (const route of adminRoots) {
    await removeRouteSubtree(app, route);
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
      icon: 'settingoutlined',
      sort: 3,
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
    await ensureCollectionTitles(app);

    const pageSchemas = [];
    for (const pageDef of PAGE_DEFS) {
      const fieldMap = await getFieldMap(app, pageDef.collection);
      pageSchemas.push({
        ...pageDef,
        schema: (() => {
          const schema = buildPageSchema(pageDef.collection, pageDef.columns, pageDef.createFields, pageDef.editFields, fieldMap);
          if (pageDef.countriesFilterForm) {
            addCountriesFilterForm(schema, pageDef.collection);
          }
          return schema;
        })(),
      });
    }

    await resetAdminRoutes(app);
    await createRoutes(app, pageSchemas);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
