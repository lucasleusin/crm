set -euo pipefail

cd /opt/stacks/wordpress
set -a
source .env

backup_db="crm_prod_backup_$(date +%Y%m%d_%H%M%S)"

mapfile -t tables < <(
  docker exec -i wordpress_db mariadb -N -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'crm_prod'
      AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME;
  "
)

docker exec -i wordpress_db mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
  CREATE DATABASE \`$backup_db\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
"

for table in "${tables[@]}"; do
  if [ -z "$table" ]; then
    continue
  fi

  docker exec -i wordpress_db mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
    CREATE TABLE \`$backup_db\`.\`$table\` LIKE \`crm_prod\`.\`$table\`;
    INSERT INTO \`$backup_db\`.\`$table\`
    SELECT * FROM \`crm_prod\`.\`$table\`;
  " </dev/null
done

echo "$backup_db"
docker exec -i wordpress_db mariadb -N -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = '$backup_db'
    AND TABLE_TYPE = 'BASE TABLE';
"
