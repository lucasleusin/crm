# LO Sports Consulting Collection Plan

## Core collections

- crm_countries
- crm_org_types
- crm_sports
- crm_competitions
- crm_organizations
- crm_contacts
- crm_jobs
- crm_connections
- crm_events
- crm_content_calendar
- crm_content_published
- crm_assets
- crm_activations

## Relation collections to create or simulate during import

- organizations_to_countries
- organizations_to_org_types
- organizations_to_sports
- organizations_to_competitions
- contacts_to_organizations
- contacts_to_current_country
- contacts_to_nationality
- jobs_to_organizations
- jobs_to_contacts
- connections_to_organizations
- connections_to_contacts
- connections_to_current_country
- connections_to_nationality
- competitions_to_countries
- events_to_countries
- content_published_to_content_calendar

## Key import decisions

- Rollups, inverse links, and count fields stay as snapshot fields or get recreated later.
- Duplicate natural keys are resolved with deterministic matching rules so the import stays repeatable.
- Natural keys were chosen to make the first import deterministic before creating native NocoBase IDs.

## Duplicate review queue

- contact: Brian Enge (2)
- contact: Dan Whymark (2)
- contact: Gabriel Assis (2)
- contact: Josh Murphy (2)
- contact: Monica Esperidiao Hasenclever (2)
- contact: Shane Malcolm (2)
- organization: 213 Sports (2)
- organization: Esporte Clube Pinheiros (2)
- organization: Maquina do Esporte (2)
- organization: Paulista Futebol Clube (2)
- organization: SportValor (2)

## Final production import summary

- Imported collections:
  - crm_countries: 254
  - crm_org_types: 58
  - crm_sports: 123
  - crm_competitions: 37
  - crm_organizations: 1589
  - crm_contacts: 1972
  - crm_jobs: 33
  - crm_connections: 301
  - crm_events: 27
  - crm_content_calendar: 162
  - crm_content_published: 64
  - crm_assets: 60
  - crm_activations: 79
- Applied relations:
  - organizations_to_countries: 1320
  - organizations_to_org_types: 1572
  - organizations_to_sports: 506
  - organizations_to_competitions: 62
  - contacts_to_organizations: 1972
  - contacts_to_current_country: 1970
  - contacts_to_nationality: 1215
  - jobs_to_organizations: 33
  - jobs_to_contacts: 33
  - connections_to_organizations: 301
  - connections_to_contacts: 301
  - connections_to_current_country: 301
  - connections_to_nationality: 296
  - competitions_to_countries: 37
  - events_to_countries: 25
  - content_published_to_content_calendar: 35
- Unresolved relations after parser fix: 0
