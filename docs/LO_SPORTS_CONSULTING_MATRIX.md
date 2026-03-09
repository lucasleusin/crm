# LO Sports Consulting Base Migration Matrix

## Legend

- `import as source`: keep as a normal field in NocoBase and treat Airtable CSV as source of truth.
- `import as relation`: create a real NocoBase relation and resolve values against another imported table.
- `recreate in NocoBase`: do not import as source-of-truth; derive later from relations or NocoBase logic.
- `import temporarily`: import as a plain snapshot field for v1 QA/history, but not as long-term source-of-truth.
- `historical`: preserve as plain audit/history data from Airtable CSV.
- `skip v1`: do not import in the first pass.

## Cross-table rules for this base

- Import order: `Country`, `Org Types`, `Sports`, `Competitions`, `Organizations`, `Contacts`, `Jobs`, `Events`, `Connections`, `Content Calendar`, `Content-Published`, `Assets`, `Activations`.
- Relationship matching will use natural keys first:
  - `Country.Country`
  - `Org Types.Type`
  - `Sports.Name`
  - `Competitions.Name`
  - `Organizations.Organization Name`
  - `Contacts.Name`
  - `Content Calendar.Post_ID`
- Duplicates already detected and must be reviewed before final auto-linking:
  - `Organizations`: `Maquina do Esporte`, `213 Sports`, `SportValor`
  - `Contacts`: `Gabriel Assis`, `Josh Murphy`, `Shane Malcolm`, `Monica Esperidiao Hasenclever`
- Missing tables in current export matter:
  - `Contacts.Meetings` references meeting-style values, but no `Meetings` table was exported.
  - Some inverse link fields in `Country`, `Organizations`, `Org Types`, and `Sports` should be recreated rather than imported.

## Table decisions

### Activations

- `import as source`: `Activation`, `Categoria`, `Status`, `Local`, `Comentarios`, `Nivel`, `Necessario para Rodar`, `Custo Estimado`, `Pode ser com Parceiro?`
- No derived or relation fields detected in this table.

### Assets

- `import as source`: `Propriedade`, `Tipo`, `Descricao`, `Frequencia`, `Unidade de Medida`
- `historical`: `Created By`, `Created`

### Competitions

- `import as source`: `Name`, `Competition Period`, `Level`
- `import as relation`: `Country` -> `Country.Country`
- `import temporarily`: `Organizer`
  - Keep as plain text in v1.
  - Candidate for later relation to `Organizations`, but needs review because organizer naming may not match the organizations table exactly.

### Connections

- `import as source`: `Connection ID`, `Role`, `FMA Edition (Year)`, `Relationship Level`, `Stay Connected?`, `Source`, `Connection Date`, `Notes`, `Connection Status`, `Action Itens`, `Action Itens Status`
- `import as relation`: `Nationality` -> `Country.Country`, `Current Country` -> `Country.Country`
- `import temporarily`: `Organization`, `Person/Group`
  - Try automatic matching to `Organizations` and `Contacts` where unique.
  - Keep raw text fields in v1 because not every row is guaranteed to match uniquely.
- `skip v1`: `Meeting Minutes`
  - Currently empty in the CSV export.
- `historical`: `Created`, `Created By`, `Last Modified`, `Last Modified By`

### Contacts

- `import as source`: `Name`, `LinkedIn`, `Role`, `Sporting Director`, `Ajuda?`, `Source`, `Relationship`, `FMA Profile`, `Current City`, `Email`, `Phone #`, `FMA Edition (Year)`, `Work in Sport?`, `Stay Connected?`, `Comments`, `Export to C11`
- `import as relation`: `Organizations` -> `Organizations.Organization Name`, `Current Country` -> `Country.Country`, `Nationality` -> `Country.Country`
- `import temporarily`: `Org Type`, `Org Main Type`, `Current Continent`, `Org Head Office`, `Org Website`, `Meetings`, `Jobs`
  - `Org Type`, `Org Main Type`, `Org Head Office`, and `Org Website` behave like lookups from linked organizations.
  - `Current Continent` behaves like a lookup from `Current Country`.
  - `Meetings` and `Jobs` behave like inverse links or unresolved text; keep as snapshot until related structures are finalized.
- `recreate in NocoBase`: `# Nationality`, `# Meetings`
- `historical`: `Created Time`, `Created By`, `Last Modified Time`, `Last Modified By`

### Content Calendar

- `import as source`: `Post_ID`, `Content`, `Post Name`, `Content Type`, `Plataform`, `Account`, `Published In`, `Link`, `Status`, `Publish Date`
- `Post_ID` will be the stable import key used by `Content-Published.Content Calendar`.

### Content-Published

- `import as source`: `Content Name`, `Title`, `Type`, `Description`, `Info Source`, `Prompt de Imagem`, `Status`, `Published In`, `Published Date`
- `import as relation`: `Content Calendar` -> `Content Calendar.Post_ID`
  - Split comma-separated values like `9,33,54,77` into proper many-to-many links.

### Country

- `import as source`: `Country`, `Capital City`, `Continent`, `Region`
- `recreate in NocoBase`: `Contacts - Current Country`, `# Current Country`, `# Current Country - FMA`, `Contacts - Nationality`, `# Nationality`, `# Nationality - FMA`, `Events`, `Jobs`, `Organizations`, `Competitions`
  - These are inverse links, lookups, or counts and should be rebuilt from imported relations.

### Events
n
- `import as source`: `Name`, `Year`, `Website`, `Dates`, `City`, `Status`
- `import as relation`: `Country` -> `Country.Country`

### Jobs

- `import as source`: `Job`, `Location`, `Pay`, `Deadline`, `Status`, `Job Description - Link`, `Notes`, `My Strategy`
- `import as relation`: `Organization` -> `Organizations.Organization Name`
- `import temporarily`: `Contact`, `Country`
  - `Contact` can likely be matched to `Contacts.Name`, but duplicates mean we should keep the raw text too.
  - `Country` may be recreated from location or organization later, but for v1 it is safer to preserve the visible value.

### Org Types

- `import as source`: `Type`, `Group`
- `recreate in NocoBase`: `Organizations`
  - Inverse relation from `Organizations.Org Type`.

### Organizations

- `import as source`: `Organization Name`, `Website`, `LIE - Brazil`, `Instagram`, `Market`, `Head Office`, `Interested`, `Export to C11`, `Vendor`, `Source`, `Confederation`, `Comments`
- `import as relation`: `Org Type` -> `Org Types.Type`, `Sports` -> `Sports.Name`, `Country` -> `Country.Country`
- `import temporarily`: `Continent`, `Org Main Type`, `Contacts`, `# Contacts`, `Sport Type`, `Competitions`, `# Meetings`
  - `Continent` looks derived from `Country`.
  - `Org Main Type` likely derives from `Org Type.Group`.
  - `Contacts` and `# Contacts` are inverse/rollup fields from linked contacts.
  - `Sport Type` likely derives from linked `Sports.Type`.
  - `Competitions` is a relation candidate, but keep plain text snapshot in v1 until organizer/competition mapping is validated.
  - `# Meetings` behaves as a rollup/count.
- `historical`: `Created`, `Created By`, `Last Modified`, `Last Modified By`

### Sports

- `import as source`: `Name`, `Type`
- `recreate in NocoBase`: `Organizations`
  - Inverse relation from `Organizations.Sports`.

## Recommended v1 implementation choices

- Create real relations first for:
  - `Organizations <-> Country`
  - `Organizations <-> Org Types`
  - `Organizations <-> Sports`
  - `Contacts <-> Organizations`
  - `Contacts <-> Country` (`Current Country`, `Nationality`)
  - `Competitions <-> Country`
  - `Content-Published <-> Content Calendar`
- Keep these as plain snapshot fields in v1 even if they are probably derived:
  - `Contacts.Org Type`
  - `Contacts.Org Main Type`
  - `Contacts.Org Head Office`
  - `Contacts.Org Website`
  - `Organizations.Continent`
  - `Organizations.Org Main Type`
  - `Organizations.Sport Type`
- Do not trust count/rollup fields as source-of-truth in v1:
  - any field starting with `#`
  - inverse link aggregations like `Country.Organizations`, `Org Types.Organizations`, `Sports.Organizations`

## Manual review queue before final import

- Resolve duplicate organizations by keying on `Organization Name + Country + Website`.
- Resolve duplicate contacts by keying on `Name + Organization + LinkedIn/Email`.
- Review whether `Competitions.Organizer` should become a relation or remain text in v1.
- Review `Connections.Person/Group` because some rows may refer to a group or contact not present in `Contacts`.
- Review `Contacts.Meetings` because the related meetings table is not in the current export set.