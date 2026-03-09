# -*- coding: utf-8 -*-
import csv
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\CODEX\CRM")
RAW_DIR = ROOT / "data" / "airtable" / "raw"
OUT_DIR = ROOT / "output" / "spreadsheet" / "lo_sports_consulting"
NORMALIZED_DIR = OUT_DIR / "normalized"
RELATIONS_DIR = OUT_DIR / "relations"
REPORTS_DIR = OUT_DIR / "reports"

for directory in [OUT_DIR, NORMALIZED_DIR, RELATIONS_DIR, REPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def read_csv(name):
    path = RAW_DIR / name
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def normalize_space(value):
    value = (value or "").replace("\r", " ").replace("\n", " ").strip()
    value = re.sub(r"\s+", " ", value)
    return value


def slugify(value):
    value = normalize_space(value)
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.lower()
    ascii_value = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return ascii_value or "na"


def split_multi(value):
    value = normalize_space(value)
    if not value:
        return []
    try:
        parts = next(csv.reader([value], skipinitialspace=True))
    except csv.Error:
        parts = value.split(",")

    output = []
    seen = set()
    for part in parts:
        cleaned = normalize_space(part)
        if cleaned.startswith('"') and cleaned.endswith('"') and len(cleaned) >= 2:
            cleaned = cleaned[1:-1]
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        output.append(cleaned)
    return output


def unique_rows(rows, key_fn, extra_fn=None):
    seen = {}
    output = []
    for row in rows:
        key = key_fn(row)
        if not key:
            continue
        if key in seen:
            continue
        item = {"key": key}
        if extra_fn:
            item.update(extra_fn(row))
        seen[key] = item
        output.append(item)
    return output


def write_csv(path, rows, fieldnames):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fieldnames})


def score_completeness(row, fields):
    return sum(1 for field in fields if normalize_space(row.get(field)))


def make_org_key(row):
    website = normalize_space(row.get("Website"))
    head_office = normalize_space(row.get("Head Office"))
    country = normalize_space(row.get("Country"))
    tail = website or head_office or country or "na"
    return f"org--{slugify(row.get('Organization Name'))}--{slugify(tail)}"


def make_contact_key(row):
    orgs = split_multi(row.get("Organizations"))
    primary_org = orgs[0] if orgs else "na"
    email = normalize_space(row.get("Email"))
    linkedin = normalize_space(row.get("LinkedIn"))
    current_country = normalize_space(row.get("Current Country"))
    tail = email or linkedin or current_country or primary_org or "na"
    return f"contact--{slugify(row.get('Name'))}--{slugify(tail)}"


def make_job_key(row):
    return f"job--{slugify(row.get('Job'))}--{slugify(row.get('Organization'))}--{slugify(row.get('Deadline'))}"


def make_connection_key(row):
    return f"connection--{slugify(row.get('Connection ID'))}"


def make_competition_key(row):
    return f"competition--{slugify(row.get('Name'))}"


def make_country_key(value):
    return f"country--{slugify(value)}"


def make_org_type_key(value):
    return f"org-type--{slugify(value)}"


def make_sport_key(value):
    return f"sport--{slugify(value)}"


def make_content_calendar_key(row):
    return f"content-calendar--{slugify(row.get('Post_ID'))}"


def make_content_published_key(row, index):
    return f"content-published--{index:04d}"


def make_asset_key(row):
    return f"asset--{slugify(row.get('Propriedade'))}"


def make_activation_key(row):
    return f"activation--{slugify(row.get('Activation'))}"


contacts_rows = read_csv("Contacts-Grid view.csv")
organizations_rows = read_csv("Organizations-Grid view.csv")
country_rows = read_csv("Country-Grid view.csv")
org_types_rows = read_csv("Org Types-Grid view.csv")
sports_rows = read_csv("Sports-Grid view.csv")
competitions_rows = read_csv("Competitions-Grid view.csv")
connections_rows = read_csv("Connections-Grid view.csv")
jobs_rows = read_csv("Jobs-Grid view.csv")
events_rows = read_csv("Events-Grid view.csv")
content_calendar_rows = read_csv("Content Calendar-Grid view.csv")
content_published_rows = read_csv("Content-Published.csv")
assets_rows = read_csv("Assets-Grid view.csv")
activations_rows = read_csv("Activations-Grid view.csv")

countries = [
    {
        "country_key": make_country_key(row.get("Country")),
        "country_name": normalize_space(row.get("Country")),
        "capital_city": normalize_space(row.get("Capital City")),
        "continent": normalize_space(row.get("Continent")),
        "region": normalize_space(row.get("Region")),
    }
    for row in country_rows
    if normalize_space(row.get("Country"))
]
org_types = [
    {
        "org_type_key": make_org_type_key(row.get("Type")),
        "org_type_name": normalize_space(row.get("Type")),
        "org_group": normalize_space(row.get("Group")),
    }
    for row in org_types_rows
    if normalize_space(row.get("Type"))
]
sports = [
    {
        "sport_key": make_sport_key(row.get("Name")),
        "sport_name": normalize_space(row.get("Name")),
        "sport_type": normalize_space(row.get("Type")),
    }
    for row in sports_rows
    if normalize_space(row.get("Name"))
]
competitions = [
    {
        "competition_key": make_competition_key(row),
        "competition_name": normalize_space(row.get("Name")),
        "competition_period": normalize_space(row.get("Competition Period")),
        "competition_level": normalize_space(row.get("Level")),
        "organizer_text": normalize_space(row.get("Organizer")),
        "country_name_raw": normalize_space(row.get("Country")),
    }
    for row in competitions_rows
]
organizations = [
    {
        "organization_key": make_org_key(row),
        "organization_name": normalize_space(row.get("Organization Name")),
        "website": normalize_space(row.get("Website")),
        "lie_brazil": normalize_space(row.get("LIE - Brazil")),
        "instagram": normalize_space(row.get("Instagram")),
        "market": normalize_space(row.get("Market")),
        "head_office": normalize_space(row.get("Head Office")),
        "interested": normalize_space(row.get("Interested")),
        "export_to_c11": normalize_space(row.get("Export to C11")),
        "vendor": normalize_space(row.get("Vendor")),
        "source": normalize_space(row.get("Source")),
        "confederation": normalize_space(row.get("Confederation")),
        "comments": normalize_space(row.get("Comments")),
        "continent_snapshot": normalize_space(row.get("Continent")),
        "org_main_type_snapshot": normalize_space(row.get("Org Main Type")),
        "sport_type_snapshot": normalize_space(row.get("Sport Type")),
        "contacts_snapshot": normalize_space(row.get("Contacts")),
        "contacts_count_snapshot": normalize_space(row.get("# Contacts")),
        "competitions_snapshot": normalize_space(row.get("Competitions")),
        "meetings_count_snapshot": normalize_space(row.get("# Meetings")),
        "created_at_airtable": normalize_space(row.get("Created")),
        "created_by_airtable": normalize_space(row.get("Created By")),
        "updated_at_airtable": normalize_space(row.get("Last Modified")),
        "updated_by_airtable": normalize_space(row.get("Last Modified By")),
    }
    for row in organizations_rows
]
contacts = [
    {
        "contact_key": make_contact_key(row),
        "contact_name": normalize_space(row.get("Name")),
        "linkedin": normalize_space(row.get("LinkedIn")),
        "role": normalize_space(row.get("Role")),
        "sporting_director": normalize_space(row.get("Sporting Director")),
        "ajuda": normalize_space(row.get("Ajuda?")),
        "source": normalize_space(row.get("Source")),
        "relationship": normalize_space(row.get("Relationship")),
        "fma_profile": normalize_space(row.get("FMA Profile")),
        "current_city": normalize_space(row.get("Current City")),
        "email": normalize_space(row.get("Email")),
        "phone_number": normalize_space(row.get("Phone #")),
        "fma_edition_year": normalize_space(row.get("FMA Edition (Year)")),
        "work_in_sport": normalize_space(row.get("Work in Sport?")),
        "stay_connected": normalize_space(row.get("Stay Connected?")),
        "comments": normalize_space(row.get("Comments")),
        "export_to_c11": normalize_space(row.get("Export to C11")),
        "org_type_snapshot": normalize_space(row.get("Org Type")),
        "org_main_type_snapshot": normalize_space(row.get("Org Main Type")),
        "current_continent_snapshot": normalize_space(row.get("Current Continent")),
        "org_head_office_snapshot": normalize_space(row.get("Org Head Office")),
        "org_website_snapshot": normalize_space(row.get("Org Website")),
        "meetings_snapshot": normalize_space(row.get("Meetings")),
        "meetings_count_snapshot": normalize_space(row.get("# Meetings")),
        "jobs_snapshot": normalize_space(row.get("Jobs")),
        "nationality_count_snapshot": normalize_space(row.get("# Nationality")),
        "created_at_airtable": normalize_space(row.get("Created Time")),
        "created_by_airtable": normalize_space(row.get("Created By")),
        "updated_at_airtable": normalize_space(row.get("Last Modified Time")),
        "updated_by_airtable": normalize_space(row.get("Last Modified By")),
    }
    for row in contacts_rows
]
jobs = [
    {
        "job_key": make_job_key(row),
        "job_name": normalize_space(row.get("Job")),
        "location": normalize_space(row.get("Location")),
        "country_snapshot": normalize_space(row.get("Country")),
        "pay": normalize_space(row.get("Pay")),
        "deadline": normalize_space(row.get("Deadline")),
        "status": normalize_space(row.get("Status")),
        "job_description_link": normalize_space(row.get("Job Description - Link")),
        "notes": normalize_space(row.get("Notes")),
        "my_strategy": normalize_space(row.get("My Strategy")),
        "organization_snapshot": normalize_space(row.get("Organization")),
        "contact_snapshot": normalize_space(row.get("Contact")),
    }
    for row in jobs_rows
]
connections = [
    {
        "connection_key": make_connection_key(row),
        "connection_id": normalize_space(row.get("Connection ID")),
        "role": normalize_space(row.get("Role")),
        "fma_edition_year": normalize_space(row.get("FMA Edition (Year)")),
        "relationship_level": normalize_space(row.get("Relationship Level")),
        "stay_connected": normalize_space(row.get("Stay Connected?")),
        "source": normalize_space(row.get("Source")),
        "connection_date": normalize_space(row.get("Connection Date")),
        "notes": normalize_space(row.get("Notes")),
        "connection_status": normalize_space(row.get("Connection Status")),
        "action_items": normalize_space(row.get("Action Itens")),
        "action_items_status": normalize_space(row.get("Action Itens Status")),
        "organization_snapshot": normalize_space(row.get("Organization")),
        "person_group_snapshot": normalize_space(row.get("Person/Group")),
        "meeting_minutes": normalize_space(row.get("Meeting Minutes")),
        "created_at_airtable": normalize_space(row.get("Created")),
        "created_by_airtable": normalize_space(row.get("Created By")),
        "updated_at_airtable": normalize_space(row.get("Last Modified")),
        "updated_by_airtable": normalize_space(row.get("Last Modified By")),
    }
    for row in connections_rows
]
events = [
    {
        "event_key": f"event--{i+1:04d}",
        "event_name": normalize_space(row.get("Name")),
        "year": normalize_space(row.get("Year")),
        "website": normalize_space(row.get("Website")),
        "dates": normalize_space(row.get("Dates")),
        "city": normalize_space(row.get("City")),
        "status": normalize_space(row.get("Status")),
        "country_name_raw": normalize_space(row.get("Country")),
    }
    for i, row in enumerate(events_rows)
]
content_calendar = [
    {
        "content_calendar_key": make_content_calendar_key(row),
        "post_id": normalize_space(row.get("Post_ID")),
        "content": normalize_space(row.get("Content")),
        "post_name": normalize_space(row.get("Post Name")),
        "content_type": normalize_space(row.get("Content Type")),
        "platform": normalize_space(row.get("Plataform")),
        "account": normalize_space(row.get("Account")),
        "published_in": normalize_space(row.get("Published In")),
        "link": normalize_space(row.get("Link")),
        "status": normalize_space(row.get("Status")),
        "publish_date": normalize_space(row.get("Publish Date")),
    }
    for row in content_calendar_rows
]
content_published = [
    {
        "content_published_key": make_content_published_key(row, i + 1),
        "content_name": normalize_space(row.get("Content Name")),
        "title": normalize_space(row.get("Title")),
        "type": normalize_space(row.get("Type")),
        "description": normalize_space(row.get("Description")),
        "info_source": normalize_space(row.get("Info Source")),
        "prompt_de_imagem": normalize_space(row.get("Prompt de Imagem")),
        "status": normalize_space(row.get("Status")),
        "published_in": normalize_space(row.get("Published In")),
        "published_date": normalize_space(row.get("Published Date")),
        "content_calendar_snapshot": normalize_space(row.get("Content Calendar")),
    }
    for i, row in enumerate(content_published_rows)
]
assets = [
    {
        "asset_key": make_asset_key(row),
        "propriedade": normalize_space(row.get("Propriedade")),
        "tipo": normalize_space(row.get("Tipo")),
        "descricao": normalize_space(row.get("Descri��o")),
        "frequencia": normalize_space(row.get("Frequencia")),
        "unidade_de_medida": normalize_space(row.get("Unidade de Medida")),
        "created_by_airtable": normalize_space(row.get("Created By")),
        "created_at_airtable": normalize_space(row.get("Created")),
    }
    for row in assets_rows
]
activations = [
    {
        "activation_key": make_activation_key(row),
        "activation": normalize_space(row.get("Activation")),
        "categoria": normalize_space(row.get("Categoria")),
        "status": normalize_space(row.get("Status")),
        "local": normalize_space(row.get("Local")),
        "comentarios": normalize_space(row.get("Coment�rios")),
        "nivel": normalize_space(row.get("N�vel")),
        "necessario_para_rodar": normalize_space(row.get("Necess�rio para Rodar")),
        "custo_estimado": normalize_space(row.get("Custo Estimado")),
        "pode_ser_com_parceiro": normalize_space(row.get("Pode ser com Parceiro?")),
    }
    for row in activations_rows
]

write_csv(NORMALIZED_DIR / "countries.csv", countries, list(countries[0].keys()))
write_csv(NORMALIZED_DIR / "org_types.csv", org_types, list(org_types[0].keys()))
write_csv(NORMALIZED_DIR / "sports.csv", sports, list(sports[0].keys()))
write_csv(NORMALIZED_DIR / "competitions.csv", competitions, list(competitions[0].keys()))
write_csv(NORMALIZED_DIR / "organizations.csv", organizations, list(organizations[0].keys()))
write_csv(NORMALIZED_DIR / "contacts.csv", contacts, list(contacts[0].keys()))
write_csv(NORMALIZED_DIR / "jobs.csv", jobs, list(jobs[0].keys()))
write_csv(NORMALIZED_DIR / "connections.csv", connections, list(connections[0].keys()))
write_csv(NORMALIZED_DIR / "events.csv", events, list(events[0].keys()))
write_csv(NORMALIZED_DIR / "content_calendar.csv", content_calendar, list(content_calendar[0].keys()))
write_csv(NORMALIZED_DIR / "content_published.csv", content_published, list(content_published[0].keys()))
write_csv(NORMALIZED_DIR / "assets.csv", assets, list(assets[0].keys()))
write_csv(NORMALIZED_DIR / "activations.csv", activations, list(activations[0].keys()))

org_name_counter = Counter(normalize_space(r.get("Organization Name")) for r in organizations_rows if normalize_space(r.get("Organization Name")))
contact_name_counter = Counter(normalize_space(r.get("Name")) for r in contacts_rows if normalize_space(r.get("Name")))

relations = []
unresolved = []

country_lookup = {row["country_name"]: row["country_key"] for row in countries}
org_type_lookup = {row["org_type_name"]: row["org_type_key"] for row in org_types}
sport_lookup = {row["sport_name"]: row["sport_key"] for row in sports}
competition_lookup = {row["competition_name"]: row["competition_key"] for row in competitions}
content_calendar_lookup = {row["post_id"]: row["content_calendar_key"] for row in content_calendar}
org_lookup_unique = {}
org_lookup_counts = Counter(normalize_space(r.get("Organization Name")) for r in organizations_rows if normalize_space(r.get("Organization Name")))
for row in organizations:
    if org_lookup_counts[row["organization_name"]] == 1:
        org_lookup_unique[row["organization_name"]] = row["organization_key"]
org_lookup_preferred = dict(org_lookup_unique)
org_candidates = defaultdict(list)
for raw_row in organizations_rows:
    organization_name = normalize_space(raw_row.get("Organization Name"))
    if not organization_name:
        continue
    org_candidates[organization_name].append(
        {
            "organization_key": make_org_key(raw_row),
            "score": score_completeness(
                raw_row,
                [
                    "Website",
                    "Country",
                    "Head Office",
                    "Org Type",
                    "Sports",
                    "Market",
                    "Comments",
                ],
            ),
        }
    )
for organization_name, candidates in org_candidates.items():
    if organization_name in org_lookup_preferred:
        continue
    ranked = sorted(candidates, key=lambda item: item["score"], reverse=True)
    if len(ranked) == 1 or ranked[0]["score"] > ranked[1]["score"]:
        org_lookup_preferred[organization_name] = ranked[0]["organization_key"]

contact_lookup_unique = {}
contact_lookup_counts = Counter(normalize_space(r.get("Name")) for r in contacts_rows if normalize_space(r.get("Name")))
for row in contacts:
    if contact_lookup_counts[row["contact_name"]] == 1:
        contact_lookup_unique[row["contact_name"]] = row["contact_key"]
contact_lookup_by_name_org = {}
contact_name_org_counts = Counter()
for raw_row in contacts_rows:
    contact_name = normalize_space(raw_row.get("Name"))
    if not contact_name:
        continue
    for organization_name in split_multi(raw_row.get("Organizations")):
        contact_name_org_counts[(contact_name, organization_name)] += 1
for raw_row in contacts_rows:
    contact_name = normalize_space(raw_row.get("Name"))
    if not contact_name:
        continue
    contact_key = make_contact_key(raw_row)
    for organization_name in split_multi(raw_row.get("Organizations")):
        pair = (contact_name, organization_name)
        if contact_name_org_counts[pair] == 1:
            contact_lookup_by_name_org[pair] = contact_key


def add_relation(relation_name, source_key, target_raw, lookup, target_field, allow_ambiguous=False):
    for target_name in split_multi(target_raw):
        target_key = lookup.get(target_name)
        status = "matched" if target_key else "missing"
        if (
            not allow_ambiguous
            and not target_key
            and relation_name.endswith("organizations")
            and org_lookup_counts.get(target_name, 0) > 1
        ):
            status = "ambiguous"
            target_key = ""
        if (
            not allow_ambiguous
            and not target_key
            and relation_name.endswith("contacts")
            and contact_lookup_counts.get(target_name, 0) > 1
        ):
            status = "ambiguous"
            target_key = ""
        row = {
            "relation_name": relation_name,
            "source_key": source_key,
            target_field: target_name,
            "target_key": target_key or "",
            "status": status,
        }
        relations.append(row)
        if status != "matched":
            unresolved.append(row)

for row in organizations_rows:
    org_key = make_org_key(row)
    add_relation("organizations_to_countries", org_key, row.get("Country"), country_lookup, "target_name")
    add_relation("organizations_to_org_types", org_key, row.get("Org Type"), org_type_lookup, "target_name")
    add_relation("organizations_to_sports", org_key, row.get("Sports"), sport_lookup, "target_name")
    add_relation("organizations_to_competitions", org_key, row.get("Competitions"), competition_lookup, "target_name", allow_ambiguous=True)

for row in contacts_rows:
    contact_key = make_contact_key(row)
    add_relation("contacts_to_organizations", contact_key, row.get("Organizations"), org_lookup_preferred, "target_name")
    add_relation("contacts_to_current_country", contact_key, row.get("Current Country"), country_lookup, "target_name")
    add_relation("contacts_to_nationality", contact_key, row.get("Nationality"), country_lookup, "target_name")

for row in jobs_rows:
    job_key = make_job_key(row)
    add_relation("jobs_to_organizations", job_key, row.get("Organization"), org_lookup_preferred, "target_name")
    add_relation("jobs_to_contacts", job_key, row.get("Contact"), contact_lookup_unique, "target_name")

for row in connections_rows:
    connection_key = make_connection_key(row)
    add_relation("connections_to_organizations", connection_key, row.get("Organization"), org_lookup_preferred, "target_name")
    person_group_name = normalize_space(row.get("Person/Group"))
    organization_name = normalize_space(row.get("Organization"))
    contact_key = contact_lookup_by_name_org.get((person_group_name, organization_name))
    if contact_key:
        relations.append(
            {
                "relation_name": "connections_to_contacts",
                "source_key": connection_key,
                "target_name": person_group_name,
                "target_key": contact_key,
                "status": "matched",
            }
        )
    else:
        add_relation("connections_to_contacts", connection_key, row.get("Person/Group"), contact_lookup_unique, "target_name")
    add_relation("connections_to_current_country", connection_key, row.get("Current Country"), country_lookup, "target_name")
    add_relation("connections_to_nationality", connection_key, row.get("Nationality"), country_lookup, "target_name")

for row in competitions_rows:
    competition_key = make_competition_key(row)
    add_relation("competitions_to_countries", competition_key, row.get("Country"), country_lookup, "target_name")

for row in events_rows:
    event_key = f"event--{events_rows.index(row)+1:04d}"
    add_relation("events_to_countries", event_key, row.get("Country"), country_lookup, "target_name")

for index, row in enumerate(content_published_rows, start=1):
    content_key = make_content_published_key(row, index)
    for target_name in split_multi(row.get("Content Calendar")):
        target_key = content_calendar_lookup.get(target_name)
        status = "matched" if target_key else "missing"
        relation_row = {
            "relation_name": "content_published_to_content_calendar",
            "source_key": content_key,
            "target_name": target_name,
            "target_key": target_key or "",
            "status": status,
        }
        relations.append(relation_row)
        if status != "matched":
            unresolved.append(relation_row)

relation_fieldnames = ["relation_name", "source_key", "target_name", "target_key", "status"]
write_csv(RELATIONS_DIR / "all_relations.csv", relations, relation_fieldnames)
write_csv(REPORTS_DIR / "unresolved_relations.csv", unresolved, relation_fieldnames)

org_duplicates = [
    {
        "entity": "organization",
        "duplicate_value": name,
        "count": count,
    }
    for name, count in org_name_counter.items()
    if count > 1
]
contact_duplicates = [
    {
        "entity": "contact",
        "duplicate_value": name,
        "count": count,
    }
    for name, count in contact_name_counter.items()
    if count > 1
]
write_csv(REPORTS_DIR / "duplicates.csv", org_duplicates + contact_duplicates, ["entity", "duplicate_value", "count"])

collection_plan_rows = [
    {"collection": "countries", "source_file": "Country-Grid view.csv", "primary_key": "country_key", "notes": "Reference table"},
    {"collection": "org_types", "source_file": "Org Types-Grid view.csv", "primary_key": "org_type_key", "notes": "Reference table"},
    {"collection": "sports", "source_file": "Sports-Grid view.csv", "primary_key": "sport_key", "notes": "Reference table"},
    {"collection": "competitions", "source_file": "Competitions-Grid view.csv", "primary_key": "competition_key", "notes": "Country relation now; organizer stays as text snapshot"},
    {"collection": "organizations", "source_file": "Organizations-Grid view.csv", "primary_key": "organization_key", "notes": "Main entity with relation tables for countries, org types, sports"},
    {"collection": "contacts", "source_file": "Contacts-Grid view.csv", "primary_key": "contact_key", "notes": "Main entity with relation tables for organizations and countries"},
    {"collection": "jobs", "source_file": "Jobs-Grid view.csv", "primary_key": "job_key", "notes": "Relations to organizations and contacts"},
    {"collection": "connections", "source_file": "Connections-Grid view.csv", "primary_key": "connection_key", "notes": "Relations to organizations, contacts, countries; unresolved rows need review"},
    {"collection": "events", "source_file": "Events-Grid view.csv", "primary_key": "event_key", "notes": "Relation to countries"},
    {"collection": "content_calendar", "source_file": "Content Calendar-Grid view.csv", "primary_key": "content_calendar_key", "notes": "Stable key by Post_ID"},
    {"collection": "content_published", "source_file": "Content-Published.csv", "primary_key": "content_published_key", "notes": "Many-to-many relation to content_calendar via Post_ID"},
    {"collection": "assets", "source_file": "Assets-Grid view.csv", "primary_key": "asset_key", "notes": "Standalone lookup-free table"},
    {"collection": "activations", "source_file": "Activations-Grid view.csv", "primary_key": "activation_key", "notes": "Standalone lookup-free table"},
]
write_csv(REPORTS_DIR / "collection_plan.csv", collection_plan_rows, ["collection", "source_file", "primary_key", "notes"])

summary_lines = [
    "# LO Sports Consulting Import Package",
    "",
    "## Generated assets",
    "",
    f"- Normalized collections: {len(list(NORMALIZED_DIR.glob('*.csv')))} files",
    f"- Relation exports: {len(list(RELATIONS_DIR.glob('*.csv')))} files",
    f"- Report exports: {len(list(REPORTS_DIR.glob('*.csv')))} files",
    "",
    "## Row counts",
    "",
]
for filename in sorted(NORMALIZED_DIR.glob("*.csv")):
    with filename.open("r", encoding="utf-8", newline="") as handle:
        count = sum(1 for _ in csv.DictReader(handle))
    summary_lines.append(f"- {filename.name}: {count} rows")
summary_lines.extend([
    "",
    "## Unresolved relation counts",
    "",
])
by_relation = Counter(row["relation_name"] for row in unresolved)
for relation_name, count in sorted(by_relation.items()):
    summary_lines.append(f"- {relation_name}: {count}")
summary_lines.extend([
    "",
    "## Notes",
    "",
    "- Relation files use natural-key matching against normalized reference tables.",
    "- Any row marked `ambiguous` or `missing` in `reports/unresolved_relations.csv` needs manual review before live import.",
    "- Snapshot fields that are likely Airtable lookups/rollups were preserved in the normalized collection files with `_snapshot` suffixes.",
])
(OUT_DIR / "README.md").write_text("\n".join(summary_lines), encoding="utf-8")
print(f"Prepared import package in: {OUT_DIR}")
