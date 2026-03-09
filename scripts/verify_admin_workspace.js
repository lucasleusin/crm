const { initEnv, generateAppDir } = require('@nocobase/cli/src/util');
const { Application, runPluginStaticImports } = require('@nocobase/server');
const { getConfig } = require('@nocobase/app/lib/config');

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
  const app = await bootstrapApp();
  try {
    const routes = await app.db.getRepository('desktopRoutes').find({
      sort: ['sort', 'id'],
    });
    const adminRoot = routes.find((route) => route.parentId == null && route.title === 'Admin');
    const adminChildren = routes
      .filter((route) => route.parentId === (adminRoot && adminRoot.id) && !route.hidden)
      .map((route) => route.title);
    const countriesRoute = routes.find(
      (route) => route.parentId === (adminRoot && adminRoot.id) && route.title === 'Countries',
    );

    const collections = await app.db.getRepository('dataSourcesCollections').find({
      filter: {
        dataSourceKey: 'main',
        name: ['crm_countries', 'crm_org_types', 'crm_sports'],
      },
      sort: ['name'],
    });

    const countriesSchema = countriesRoute?.schemaUid
      ? await app.db.getCollection('uiSchemas').repository.findOne({ filterByTk: countriesRoute.schemaUid })
      : null;
    if (countriesSchema?.load) {
      await countriesSchema.load({ app });
    }
    const countriesSchemaJson = countriesSchema?.toJSON ? countriesSchema.toJSON() : countriesSchema;
    const countriesSchemaRoot = countriesSchemaJson?.schema || countriesSchemaJson;

    const filterComponents = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') {
        return;
      }
      if (node['x-component'] === 'FilterFormBlockProvider' || node['x-decorator'] === 'FilterFormBlockProvider') {
        filterComponents.push('FilterFormBlockProvider');
      }
      if (node['x-component'] === 'Input.Search') {
        filterComponents.push('Input.Search');
      }
      if (node['x-component'] === 'Select') {
        filterComponents.push('Select');
      }
      if (node.properties) {
        Object.values(node.properties).forEach(walk);
      }
    };
    walk(countriesSchemaRoot);

    console.log(
      JSON.stringify(
        {
          adminRoot: adminRoot ? adminRoot.title : null,
          adminChildren,
          countriesPage: {
            schemaUid: countriesRoute?.schemaUid || null,
            schemaKeys: countriesSchemaJson ? Object.keys(countriesSchemaJson) : [],
            filterComponents,
          },
          collections: collections.map((collection) => ({
            name: collection.name,
            title: collection.title || null,
            options: collection.options || null,
            collection: collection.collection || null,
          })),
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
