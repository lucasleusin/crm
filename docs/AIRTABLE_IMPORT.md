# Migracao inicial do Airtable

## Escopo da v1

- Importar estrutura principal do CRM.
- Importar dados principais.
- Preservar relacionamentos centrais entre tabelas.
- Deixar anexos e automacoes fora desta primeira entrega.

## Convencao de arquivos

- Coloque exports brutos em `data/airtable/raw/`.
- Nao versione arquivos com dados reais do Airtable.
- Use `data/airtable/mapping-template.csv` para registrar o mapeamento de origem para destino antes da carga.

## Fluxo recomendado

1. Exportar cada tabela relevante do Airtable em `CSV` ou `XLSX`.
2. Preencher o template de mapeamento com nome da tabela, colecao alvo, chave primaria, campos e relacoes.
3. Criar as colecoes no NocoBase em producao com base no mapeamento aprovado.
4. Importar primeiro as tabelas sem dependencia.
5. Importar depois as tabelas relacionais e validar os vinculos.
6. Registrar qualquer transformacao manual aplicada aos dados no proprio template de mapeamento.

## Criterios de validacao

- Todas as tabelas de escopo v1 existem no NocoBase.
- Os campos principais foram criados com tipos compativeis.
- Os relacionamentos definidos no template estao representados no CRM.
- A contagem de registros por tabela bate com o export aprovado para a v1.