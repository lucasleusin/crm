CREATE DATABASE IF NOT EXISTS `crm_prod`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'crm_prod_user'@'%'
  IDENTIFIED BY 'replace-with-a-strong-password';

GRANT ALL PRIVILEGES ON `crm_prod`.* TO 'crm_prod_user'@'%';

FLUSH PRIVILEGES;