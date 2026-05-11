# DataCite 4.6 JSON-LD Vocabulary & Schema Profiles

This repository provides machine-readable linked data resources for the **DataCite Metadata Schema v4.6**: RDF class and property definitions, controlled vocabulary terms as resolvable IRIs, JSON Schema validation profiles, an XML-to-JSON conversion script, and SKOS/JSKOS crosswalk mappings to external vocabularies.

It is the working source for a GitHub Pages vocabulary namespace and for tooling used by DataCite integrators, NFDI services, and linked data applications.

---

## Repository Layout

```
.
├── rdf-vocabulary-staging/          # Core JSON-LD vocabulary (classes, properties, vocab terms)
│   ├── class/                       # 21 RDF class definitions (Resource, Creator, Title, …)
│   ├── property/                    # 78 RDF property definitions (identifier, creatorName, …)
│   ├── vocab/                       # Controlled vocabularies (7 enumeration families)
│   │   ├── contributorType/
│   │   ├── dateType/
│   │   ├── descriptionType/
│   │   ├── nameType/
│   │   ├── relatedIdentifierType/
│   │   ├── relationType/
│   │   └── resourceTypeGeneral/
│   ├── context/
│   │   └── fullcontext.jsonld       # Full JSON-LD context mapping DataCite keys to IRIs
│   └── manifest/
│       └── datacite-4.6.json        # Versioned index of all defined resources
│
├── validation-and-conversion/
│   ├── schemas/
│   │   ├── schema-profiles/         # JSON Schema profiles for API validation
│   │   │   ├── datacite4.6-profile.json   # Submission (POST/PUT) profile
│   │   │   ├── datacite4.6-schema.json    # Core attribute schema
│   │   │   ├── integrated.json            # Self-contained merged profile
│   │   │   ├── datacite_api.jsonld        # JSON-LD context for API payloads
│   │   │   ├── rules.json                 # Supplementary validation rules
│   │   │   └── titleTypes.jsonld          # Title type vocabulary fragment
│   │   └── xsd/                     # Official DataCite XSD schema files
│   ├── scripts/
│   │   ├── convert.py               # Convert DataCite XML → REST API JSON
│   │   ├── validate.js              # Validate JSKOS mappings (requires jskos-validate)
│   │   └── validate_xml.rb          # Validate DataCite XML against XSD
│   └── examples/
│       ├── datacite-example-full-v4.xml
│       ├── record.json              # Example REST API JSON record
│       ├── datacite_example_filledin.json
│       └── xml-roundtrip/           # XML ↔ JSON roundtrip experiment and notes
│
├── mappings/
│   ├── SKOS_crosswalks.jsonld       # SKOS mappings to Schema.org, DCAT, DCTERMS, Wikidata
│   └── jskos-mappings.json          # JSKOS-format mappings
│
├── rdf-build-scripts/
│   ├── generate-production-namespace.sh  # Replace staging URLs with production URLs
│   ├── generate-index-pages.js           # Build HTML index pages for the GitHub Pages site
│   ├── manifest-sync.js                  # Sync the manifest file with vocabulary contents
│   └── synCheck.py                       # Syntax check for vocabulary files
│
└── website/
    ├── index.html                   # Landing page (deployed to GitHub Pages)
    └── docs-index.html              # Documentation index page
```

> **Staging vs production namespace**: All files in `rdf-vocabulary-staging/` use the `https://schema.stage.datacite.org` namespace. The `generate-production-namespace.sh` script produces a `production-namespace/` copy with `https://schema.datacite.org` substituted in. The GitHub Pages deployment uses the staging namespace directly; the production copy is generated separately for release.

---

## How to Use

### 1. Explore the vocabulary

The `manifest/datacite-4.6.json` file is a versioned index of every defined class, property, and vocabulary term. Start here to discover what is available:

```bash
# View the manifest
cat rdf-vocabulary-staging/manifest/datacite-4.6.json
```

Individual term files follow a predictable structure:
- **class files** (`class/Resource.jsonld`) — define the IRI, `rdf:type`, `rdfs:label`, and `rdfs:comment` for a DataCite entity
- **property files** (`property/identifier.jsonld`) — define the IRI and domain/range for a DataCite metadata field
- **vocab term files** (`vocab/resourceTypeGeneral/Dataset.jsonld`) — define a controlled term with `skos:prefLabel`, `skos:definition`, `skos:inScheme`, and optional `skos:closeMatch` mappings

### 2. Use the JSON-LD context

`rdf-vocabulary-staging/context/fullcontext.jsonld` maps DataCite-style compact JSON keys to their full IRIs. Reference it in your JSON-LD documents:

```json
{
  "@context": "https://schema.stage.datacite.org/context/fullcontext.jsonld",
  "@type": "Resource",
  "identifier": "10.1234/example",
  "creator": [{ "creatorName": "Smith, Jane" }]
}
```

### 3. Validate a DataCite XML record

`validation-and-conversion/scripts/validate_xml.rb` validates an XML file against the DataCite XSD schema. Requires Ruby.

### 4. Convert DataCite XML to REST API JSON

`validation-and-conversion/scripts/convert.py` parses a DataCite XML file and produces a JSON payload matching the DataCite REST API structure (i.e., a `data.attributes` envelope).

```bash
# Print JSON to stdout
python3 validation-and-conversion/scripts/convert.py \
    validation-and-conversion/examples/datacite-example-full-v4.xml

# Write to a file
python3 validation-and-conversion/scripts/convert.py \
    validation-and-conversion/examples/datacite-example-full-v4.xml \
    --output record.json
```

Requirements: Python 3 only (standard library — no external packages needed).

### 5. Validate JSKOS mappings

`validation-and-conversion/scripts/validate.js` validates an NDJSON file containing JSKOS mappings or concept records using the `jskos-validate` package.

```bash
# Install dependency first
npm install jskos-validate

# Validate a mappings file
node validation-and-conversion/scripts/validate.js mappings/jskos-mappings.json
```

### 6. Generate the production namespace

Replace all `schema.stage.datacite.org` IRIs with `schema.datacite.org` to produce a production-ready copy:

```bash
# Run from the repository root
bash rdf-build-scripts/generate-production-namespace.sh
# Output is written to production-namespace/
```

### 7. Use the JSON Schema profiles

The profiles in `validation-and-conversion/schemas/schema-profiles/` validate DataCite metadata payloads:

| File | Purpose |
|------|---------|
| `datacite4.6-profile.json` | Validates metadata submitted to the REST API (POST/PUT) |
| `datacite4.6-schema.json` | Core attribute schema (can be referenced independently) |
| `integrated.json` | Self-contained merged profile — embeds all enumerations and context, no external `$ref` dependencies |

Use any JSON Schema validator (e.g., `ajv-cli`, Python `jsonschema`) to validate your payload:

```bash
# Example with ajv-cli
npx ajv-cli validate \
    -s validation-and-conversion/schemas/schema-profiles/integrated.json \
    -d your-metadata-record.json
```

### 8. Explore SKOS crosswalks

`mappings/SKOS_crosswalks.jsonld` maps DataCite terms to Schema.org, DCAT, DCTERMS, and Wikidata using SKOS relation predicates (`skos:exactMatch`, `skos:closeMatch`, etc.). `mappings/jskos-mappings.json` provides the same mappings in JSKOS format for use with Cocoda and compatible mapping registries.

---

## GitHub Pages Deployment

Pushing to `main` with changes under `rdf-vocabulary-staging/`, `rdf-build-scripts/`, or `website/` triggers a CI workflow (`.github/workflows/deploy-pages.yml`) that:

1. Copies `rdf-vocabulary-staging/` as the site root
2. Runs `rdf-build-scripts/generate-index-pages.js` to add HTML index pages for each section
3. Copies `website/index.html` and `website/docs-index.html` as landing pages
4. Deploys the result to GitHub Pages

The published site hosts the vocabulary as a resolvable namespace so that IRI lookups for individual terms resolve to human- and machine-readable descriptions.

---

## What's New in DataCite 4.6

DataCite 4.6 adds the following controlled values, all of which are represented in the vocabulary files:

| Field | New values |
|-------|-----------|
| `resourceTypeGeneral` | `Project`, `Award` |
| `relatedIdentifierType` | `RRID`, `CSTR` |
| `contributorType` | `Translator` |
| `relationType` | `IsTranslationOf`, `HasTranslation` |
| `dateType` | `Coverage` |

---

## Key Concepts

**JSON-LD** — A JSON-based format for linked data. An `@context` maps compact JSON keys to globally unique IRIs so that different systems interpret the same key identically.

**SKOS** — The W3C Simple Knowledge Organization System. Used here to define controlled vocabulary terms and to map DataCite terms to equivalent terms in Schema.org, DCAT, and other vocabularies.

**Staging namespace** — `schema.stage.datacite.org` IRIs are used in the vocabulary files in this repository. They resolve on the GitHub Pages site. The production namespace (`schema.datacite.org`) is generated separately via `rdf-build-scripts/generate-production-namespace.sh`.

**JSON Schema profile vs JSON-LD context** — The schema profiles (`validation-and-conversion/schemas/schema-profiles/`) check the *structure* of a JSON record (required fields, allowed values, data types). The JSON-LD context (`rdf-vocabulary-staging/context/fullcontext.jsonld`) gives those fields *semantic meaning* as linked data. Both can be used on the same JSON document.

---

## References

- DataCite Metadata Schema 4.6 — https://schema.datacite.org/meta/kernel-4.6/
- DataCite REST API — https://support.datacite.org/docs/api
- DataCite 4.6 Release Notes — https://support.datacite.org/docs/datacite-metadata-schema-46-release-notes
- JSON-LD specification — https://json-ld.org/
- JSON Schema specification — https://json-schema.org/
- SKOS Primer — https://www.w3.org/TR/skos-primer/
- JSKOS format — https://gbv.github.io/jskos/
