# CRM LOSports Consulting

CRM proprio da LOSports Consulting, baseado em NocoBase, preparado para subir em `crm.losportsconsulting.com` no mesmo VPS do WordPress.

## Stack

- NocoBase `2.0.12`
- Node `20.20.0`
- Yarn Classic `1.22.22`
- MariaDB externo ao app, com schema e usuario exclusivos do CRM
- Deploy em Docker, com reverse proxy ja existente via Caddy

## Bootstrap local

1. Use Node `20.x` e Yarn Classic `1.22.22`.
2. Copie `.env.example` para `.env` e ajuste as variaveis.
3. Instale dependencias com `yarn install`.
4. Faca a checagem local com `yarn build`.

Observacao importante: nesta maquina Windows ARM, o bootstrap local so fechou com um runtime Node 20 x64 portatil fora do versionamento. No VPS, o esperado e usar Node 20 x64 padrao dentro do build Docker.

## Deploy no VPS

1. Copie `.env.production.example` para `.env.production` e preencha os segredos reais.
2. Copie `deploy/crm.env.example` para `deploy/crm.env` e ajuste nomes de rede/container.
3. Crie o schema e o usuario do CRM com `ops/sql/01-create-crm-db.sql`.
4. Suba o servico com o compose em `deploy/docker-compose.crm.yml`.
5. Substitua o placeholder do Caddy usando `deploy/Caddyfile.crm.snippet`.
6. Valide o DNS do Cloudflare apontando `crm.losportsconsulting.com` para o IP atual do VPS.

O passo a passo detalhado de producao esta em `docs/DEPLOYMENT.md`.

## Migracao do Airtable

- Os exports brutos devem ficar em `data/airtable/raw/` e nao entram no git.
- O mapeamento inicial de tabelas/campos/relacionamentos deve partir de `data/airtable/mapping-template.csv`.
- O fluxo v1 cobre estrutura, dados principais e relacionamentos centrais. Anexos e automacoes ficam fora.

Detalhes em `docs/AIRTABLE_IMPORT.md`.