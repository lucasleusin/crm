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
        // Ignore orphaned or already-removed schema trees.
      }
    }
    await routeRepo.destroy({ filter: { id: route.id } });
  }
}

async function deleteImportedRoutes(app) {
  const routeRepo = app.db.getRepository('desktopRoutes');
  const routes = await routeRepo.find();
  const rootTitles = ['CRM', 'Admin', 'Organizations', 'Contacts', 'Jobs', 'Connections'];
  const roots = routes.filter((route) => route.parentId == null && rootTitles.includes(route.title));

  for (const route of roots) {
    await removeRouteSubtree(app, route);
  }
}

async function deleteImportedMetadata(app) {
  const sequelize = app.db.sequelize;
  const fieldsTable = app.db.getRepository('dataSourcesFields').model.getTableName();
  const collectionsTable = app.db.getRepository('dataSourcesCollections').model.getTableName();

  await sequelize.query(`
    DELETE FROM ${fieldsTable}
    WHERE collectionName LIKE 'crm\\_%'
  `);

  await sequelize.query(`
    DELETE FROM ${collectionsTable}
    WHERE name LIKE 'crm\\_%'
  `);
}

async function dropImportedTables(app) {
  const sequelize = app.db.sequelize;
  const [rows] = await sequelize.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE 'crm\\_%'
    ORDER BY TABLE_NAME
  `);

  if (rows.length === 0) {
    return [];
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const row of rows) {
      await sequelize.query(`DROP TABLE IF EXISTS \`${row.TABLE_NAME}\``);
    }
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  return rows.map((row) => row.TABLE_NAME);
}

async function main() {
  const app = await bootstrapApp();
  try {
    await deleteImportedRoutes(app);
    await deleteImportedMetadata(app);
    const droppedTables = await dropImportedTables(app);
    console.log(
      JSON.stringify(
        {
          droppedTables,
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
