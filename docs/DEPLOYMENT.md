# Deploy do CRM no VPS

## Arquivos usados

- `.env.production.example`: modelo das variaveis reais do app.
- `deploy/crm.env.example`: nomes da rede Docker compartilhada com Caddy e da rede do MariaDB.
- `deploy/docker-compose.crm.yml`: compose separado do CRM.
- `deploy/Caddyfile.crm.snippet`: bloco do subdominio no Caddy.
- `ops/sql/01-create-crm-db.sql`: criacao do schema e do usuario do CRM.

## Ordem de execucao

1. No VPS, confirme os nomes reais da rede usada hoje pelo Caddy e da rede em que o MariaDB existente esta conectado.
2. Crie `deploy/crm.env` a partir do exemplo e preencha `CRM_PROXY_NETWORK` e `CRM_DB_NETWORK`.
3. Crie `.env.production` a partir do exemplo e preencha os segredos reais do app e do banco.
4. Execute o SQL de criacao do schema/usuario no MariaDB atual.
5. No diretorio `deploy/`, rode `docker compose -f docker-compose.crm.yml up -d --build`.
6. Substitua o placeholder atual do `crm.losportsconsulting.com` no `Caddyfile` pelo snippet deste repo.
7. Recarregue o Caddy e valide `https://crm.losportsconsulting.com`.

## Verificacoes pos-deploy

- `docker compose -f deploy/docker-compose.crm.yml ps`
- `docker compose -f deploy/docker-compose.crm.yml logs -f crm-app`
- A pagina de login do NocoBase responde em HTTPS.
- `losportsconsulting.com` e `new.losportsconsulting.com` continuam apontando para o WordPress.

## Notas operacionais

- O compose do CRM fica separado do WordPress para isolar ciclo de deploy, logs e restart.
- O volume `crm_storage` preserva uploads, logs e artefatos do app entre reinicios.
- O snippet do Caddy assume que o servico ficara acessivel pelo hostname Docker `crm-app` na mesma rede do proxy.