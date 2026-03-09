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

    const collections = await app.db.getRepository('dataSourcesCollections').find({
      filter: {
        dataSourceKey: 'main',
        name: ['crm_countries', 'crm_org_types', 'crm_sports'],
      },
      sort: ['name'],
    });

    console.log(
      JSON.stringify(
        {
          adminRoot: adminRoot ? adminRoot.title : null,
          adminChildren,
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
