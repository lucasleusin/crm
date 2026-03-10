set -euo pipefail

cd /opt/stacks/wordpress
set -a
source .env

docker exec -i wordpress_db mariadb -N -uroot -p"$MYSQL_ROOT_PASSWORD" crm_prod -e "
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = 'crm_prod'
    AND TABLE_NAME LIKE 'crm\\_%';

  SELECT COUNT(*)
  FROM desktopRoutes
  WHERE title IN ('CRM', 'Admin');
"
