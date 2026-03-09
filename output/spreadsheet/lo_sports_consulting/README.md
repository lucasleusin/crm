# LO Sports Consulting Import Package

## Generated assets

- Normalized collections: 13 files
- Relation exports: 1 files
- Report exports: 3 files

## Row counts

- activations.csv: 79 rows
- assets.csv: 60 rows
- competitions.csv: 37 rows
- connections.csv: 301 rows
- contacts.csv: 1972 rows
- content_calendar.csv: 162 rows
- content_published.csv: 64 rows
- countries.csv: 254 rows
- events.csv: 27 rows
- jobs.csv: 33 rows
- org_types.csv: 58 rows
- organizations.csv: 1589 rows
- sports.csv: 123 rows

## Unresolved relation counts

- none

## Live import status

- Imported into production NocoBase on 2026-03-09
- Target collections use the `crm_` prefix to avoid conflicts with NocoBase system tables
- See `reports/nocobase_import_report.json` for the final schema, row, and relation totals
## Notes

- Relation files use natural-key matching against normalized reference tables.
- Any row marked `ambiguous` or `missing` in `reports/unresolved_relations.csv` needs manual review before a future re-import.
- Snapshot fields that are likely Airtable lookups/rollups were preserved in the normalized collection files with `_snapshot` suffixes.
