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
│   └── synCheck.py                       # Sync check: verify schema-profile $defs match vocab term files
│
└── website/
    ├── index.html                   # Landing page (deployed to GitHub Pages)
    └── docs-index.html              # Documentation index page
```

> **Staging vs production namespace**: All files in `rdf-vocabulary-staging/` use the `https://schema.stage.datacite.org` namespace. The `generate-production-namespace.sh` script produces a `production-namespace/` copy with `https://schema.datacite.org` substituted in. The GitHub Pages deployment uses the staging namespace directly; the production copy is generated separately for release.

---

## Repository Layout

```
datacite4.6-jsonld/
├── rdf-vocabulary-staging/        # Vocabulary source files (edit these)
│   ├── class/                     # 21 RDF class definitions (.jsonld)
│   ├── property/                  # 78+ RDF property definitions (.jsonld)
│   ├── vocab/                     # Controlled vocabularies (schemes + term files)
│   ├── context/                   # JSON-LD context files
│   ├── manifest/                  # Versioned inventories (datacite-4.6.json, …)
│   └── dist/                      # Generated distribution bundles (created by scripts)
├── rdf-build-scripts/             # Automation scripts
│   ├── detect-datacite-release.js
│   ├── apply-datacite-release-plan.js
│   ├── build-distribution.js
│   ├── manifest-sync.js
│   ├── release-snapshot.js
│   ├── update-current-pointers.js
│   ├── generate-index-pages.js
│   ├── update-root-index.js
│   └── lib/                       # Shared libraries (versioning, release-import modules)
├── .github/workflows/             # CI/CD workflows
│   ├── deploy-pages.yml           # Auto-deploy vocabulary browser to GitHub Pages
│   ├── detect-datacite-release.yml
│   ├── apply-datacite-release-plan.yml
│   └── release-snapshot.yml
├── reports/                       # Generated release plans and apply reports
├── validation-and-conversion/     # JSON Schema profiles, XSD, conversion scripts
├── mappings/                      # SKOS crosswalks and JSKOS mappings
└── website/                       # Hand-authored landing pages
```

---

## Upgrading to a New DataCite Version

The release pipeline is a three-step process: **detect → review → apply**. All three steps have both a GitHub Actions workflow (for CI) and a local Node.js command (for development).

### Prerequisites

- Node.js 20+
- [Apache Jena](https://jena.apache.org/download/) (`riot` on PATH) — only needed for `build-distribution` / `release-snapshot`, which generate `.ttl` and `.rdf` files.

---

### Step 1 — Detect

**What it does:** Fetches the official DataCite schema release page, compares it to the local manifest versions, and writes a machine-readable JSON plan plus a Markdown report under `reports/`.

**Via GitHub Actions:**

1. Go to **Actions → Detect DataCite Release → Run workflow**
2. Optionally fill in `version` (e.g. `4.7`) and `release_date` (e.g. `2026-03-03`). Leave both blank to auto-detect the next release.
3. Enable **Commit plan files** (default: on) to push the plan to the branch automatically.

**Locally:**

```bash
# Auto-detect next release
node rdf-build-scripts/detect-datacite-release.js

# Target a specific version
node rdf-build-scripts/detect-datacite-release.js --version 4.7 --release-date 2026-03-03
```

**Output files:**

| File | Description |
|---|---|
| `reports/release-import-plan-4.7.json` | Machine-readable change plan — edit this to approve/skip changes |
| `reports/release-import-plan-4.7.md` | Human-readable summary of detected changes |

---

### Step 2 — Review and approve the plan

Open `reports/release-import-plan-4.7.json`. Each detected change has a `"status"` field:

| Status | Meaning |
|---|---|
| `"proposed"` | Automatically detected; ready to approve |
| `"apply"` | **Change this from `"proposed"` to approve it for the next step** |
| `"skip"` | Intentionally excluded from this run |
| `"manual"` | Requires manual attention before it can be applied (e.g. renames, removals) |

Change every `"proposed"` entry you want to apply to `"apply"`. Entries left as `"proposed"` or `"manual"` are skipped.

**Typical 4.6 → 4.7 plan looks like:**

```jsonc
{
  "targetVersion": "4.7",
  "releaseDate": "2026-03-03",
  "changes": [
    {
      "id": "controlled-list-values-added:resourceTypeGeneral:4.7",
      "module": "controlled-list",
      "kind": "controlled-list-values-added",
      "status": "apply",       // ← set to "apply" to include
      "summary": "Add resourceTypeGeneral terms: Poster, Presentation"
    },
    {
      "id": "controlled-list-values-added:relatedIdentifierType:4.7",
      "module": "controlled-list",
      "status": "apply",
      "summary": "Add relatedIdentifierType terms: RAiD, SWHID"
    },
    {
      "id": "controlled-list-values-added:relationType:4.7",
      "module": "controlled-list",
      "status": "apply",
      "summary": "Add relationType terms: Other"
    },
    {
      "id": "simple-property-added:relationTypeInformation:4.7",
      "module": "simple-property",
      "status": "apply",
      "summary": "Add simple property relationTypeInformation"
    }
  ]
}
```

---

### Step 3 — Apply

**What it does:** Reads the approved plan, writes new vocab term files into `rdf-vocabulary-staging/`, updates scheme files and `context/fullcontext.jsonld`, then builds a full versioned snapshot (manifest + dist bundles + index pages).

**Via GitHub Actions:**

1. Go to **Actions → Apply DataCite Release Plan → Run workflow**
2. Set `plan_path` to `reports/release-import-plan-4.7.json`
3. Leave module toggles at their defaults unless you want to selectively run only some modules
4. Enable **Commit generated files** (default: on) to push all outputs back to the branch

**Locally:**

```bash
node rdf-build-scripts/apply-datacite-release-plan.js \
  --plan reports/release-import-plan-4.7.json \
  --set-current
```

**What gets written:**

| Path | Description |
|---|---|
| `rdf-vocabulary-staging/vocab/<scheme>/<Term>.jsonld` | New term files |
| `rdf-vocabulary-staging/vocab/<scheme>/<scheme>.jsonld` | Updated scheme with new `hasTopConcept` entries |
| `rdf-vocabulary-staging/property/<name>.jsonld` | New property files (for simple-property changes) |
| `rdf-vocabulary-staging/context/fullcontext.jsonld` | Updated context mappings |
| `rdf-vocabulary-staging/manifest/datacite-4.7.json` | New versioned manifest |
| `rdf-vocabulary-staging/manifest/release-matrix-4.6-4.7.json` | Change delta between versions |
| `rdf-vocabulary-staging/manifest/datacite-current.json` | Updated current-version pointer |
| `rdf-vocabulary-staging/dist/datacite-4.7.{jsonld,ttl,rdf}` | Bundled distribution in 3 RDF formats |
| `rdf-vocabulary-staging/dist/datacite-current.jsonld` | Pointer to the current distribution |
| `rdf-vocabulary-staging/dist/datacite.{jsonld,ttl,rdf}` | Moving "latest" aliases |
| `rdf-vocabulary-staging/*/index.html` | Updated vocabulary browser index pages |
| `reports/release-apply-4.7.md` | Summary of what was applied |

---

### Manual snapshot (without a plan)

If you want to rebuild the manifest and distribution for an existing version — for example after manually editing vocab files — use the snapshot workflow directly:

**Via GitHub Actions:**

1. Go to **Actions → Build Versioned Snapshot → Run workflow**
2. Set `version` (e.g. `4.6`) and optionally `release_date`

**Locally:**

```bash
node rdf-build-scripts/release-snapshot.js --version 4.6
```

This runs: `manifest-sync --write --validate` → `build-distribution` → `update-current-pointers` → `generate-index-pages` → `update-root-index`.

---

### Individual script reference

All scripts are run from the repository root. They auto-detect `rdf-vocabulary-staging/` as the vocabulary root.

| Script | Usage | Description |
|---|---|---|
| `manifest-sync.js` | `--check \| --write \| --validate [--version x.y]` | Rebuilds or validates a manifest from files on disk |
| `build-distribution.js` | `[--version x.y]` | Bundles vocab files into `dist/datacite-<v>.jsonld` and converts to `.ttl`/`.rdf` |
| `update-current-pointers.js` | `[--version x.y]` | Writes `datacite-current.json` and `dist/datacite.jsonld` aliases |
| `generate-index-pages.js` | _(no args)_ | Regenerates HTML browser index pages for class/, property/, vocab/, context/, dist/, manifest/ |
| `update-root-index.js` | _(no args)_ | Patches `rdf-vocabulary-staging/index.html` AUTO blocks with current version info |
| `detect-datacite-release.js` | `[--version x.y] [--release-date YYYY-MM-DD]` | Detects changes, writes plan to `reports/` |
| `apply-datacite-release-plan.js` | `--plan <path> [--modules <csv>] [--set-current]` | Applies an approved plan to vocab source files |
| `release-snapshot.js` | `--version x.y [--release-date YYYY-MM-DD] [--no-set-current]` | Full snapshot: manifest-sync + dist + pointers + index pages |

**Module IDs** (for `--modules` CSV in apply):

| ID | What it handles |
|---|---|
| `controlled-list` | Adds new terms to vocab schemes and creates term `.jsonld` files |
| `simple-property` | Creates a new property `.jsonld` and adds its context entry |
| `property-group` | Creates a group of related properties with shared context entries |
| `complex-structure` | Creates new class + property files for a complex nested structure |
| `rename` | Renames a controlled-list term |
| `removal` | Removes deprecated terms or context entries |

---

## What’s Inside This Repository

Here’s what you’ll find and how it fits together:
|                    Section                   |                                                                    Purpose                                                                    |                datacite4.6-profile.json (modular, specification-focused)               |                            integrated.json (production-ready, self-contained)                           |
|:--------------------------------------------:|:---------------------------------------------------------------------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------------:|:-------------------------------------------------------------------------------------------------------:|
| Root Schema (properties)                     | Core metadata model — defines structure and validation of fields like creators, titles, publisher, etc.                                       | Modular schema that mirrors DataCite REST attributes; references external definitions. | Fully inlined version with all constraints and cross-references embedded.                               |
| $defs (Definitions)                          | Controlled vocabularies and enumerations (e.g. resourceTypeGeneral, relationType, descriptionType). Used for validation and interoperability. | May still reference external enum lists or $ref to other schema fragments.             | All enumerations embedded as fragment IRIs (#enums/<list>/<term>).                                      |
| profile.@context                             | JSON-LD context mapping schema keys to RDF IRIs (e.g. creator → schema:creator). Enables semantic linking and machine readability.            | Usually externalized or minimally defined, pointing to an external context file.       | Fully integrated; includes all term mappings and @vocab definitions for standalone semantic export.     |
| submitProfile / responseProfile              | Specialized validation subsets for POST (submission) and GET (response) operations to/from the REST API.                                      | Explicitly defined as modular validation layers for REST clients.                      | Embedded and harmonized for both validation and testing.                                                |
| exportProfile                                | Rules for converting validated JSON into RDF or JSON-LD, including language-tag handling and schema crosswalks.                               | Described conceptually, may point to external scripts or mappings.                     | Fully defined with explicit conversion logic and mapping to RDF predicates.                             |
| iriMap / fragment bridges                    | Connects internal enumeration fragments to globally resolvable IRIs.                                                                          | May be incomplete or implicit.                                                         | Fully implemented, mapping fragments like #enums/resourceTypeGeneral/Dataset → canonical DataCite URIs. |
| examples, $comment, and documentation blocks | Human-readable examples and implementation notes for repository managers and developers.                                                      | Present for clarity and validation examples.                                           | Included but not semantically relevant.                                                                 |

### **integrated.json (self-contained, production-ready profile)**

-   A **fully merged version** of the DataCite 4.6 profile, designed for **standalone validation and semantic interoperability**.
    
-   Combines the **root schema**, **controlled vocabularies**, **JSON-LD context**, and **export logic** into a single file.
    
-   Self-contained — no external $ref dependencies; all controlled lists are embedded as fragment IRIs (#enums/<list>/<term>).
    
-   Suitable for both **API validation** and **Linked Data conversion**, ensuring consistent interpretation across infrastructures.
    

----------

### **Root Schema (properties)**

-   Defines the full set of DataCite metadata elements (creators, titles, publisher, relatedIdentifiers, etc.).
    
-   Mirrors the REST API’s attributes structure but aligns each property with its corresponding IRI via the embedded context.
    
-   Maintains strict validation (additionalProperties: false) for consistent and predictable client-side implementation.
    

----------

### **Embedded $defs (Enumerations and Controlled Vocabularies)**

-   All controlled lists — such as resourceTypeGeneral, relationType, descriptionType, and contributorType — are **inlined** within the file.
    
-   Each enumeration entry is assigned a **fragment IRI** (e.g., #enums/resourceTypeGeneral/Dataset) for use in RDF, JSON-LD, and mapping registries.
    
-   These fragments form the **semantic backbone** for crosswalks, resolvable vocabularies, and machine-readable metadata.
    

----------

### **profile.@context (Integrated JSON-LD Context)**

-   Provides a complete mapping of DataCite JSON keys to their RDF/Linked Data counterparts (e.g., creator → schema:creator, identifier → dcterms:identifier).
    
-   Embedded directly within the file to make the schema **self-descriptive and semantically portable**.
    
-   Ensures that downstream systems (e.g., TS4NFDI, Cocoda, FDO registries) can generate RDF graphs without requiring external lookups.
    

----------

### **exportProfile (RDF and JSON-LD Conversion Rules)**

-   Defines how validated metadata is transformed into graph form — including **language-tag rules** and **DOI normalization** to IRI form (https://doi.org/<doi>).
    
-   Enables seamless export of metadata to **RDF**, **JSON-LD**, or **Linked Data endpoints**.
    
-   Guarantees alignment between DataCite REST API outputs and their semantic representations in the broader research data ecosystem.
    

----------

### **IRI Mapping and Namespace Integration**

-   Incorporates an **iriMap** that connects internal fragments (e.g., #enums/...) to canonical DataCite namespace IRIs (https://schema.datacite.org/meta/kernel-4.6/enums/...).
    
-   Provides the foundation for consistent resolution of controlled terms across APIs, repositories, and mapping services.
    
-   Ensures compatibility with **namespace hosting** on DataCite, allowing external tools to reference individual enumeration terms directly.
    
-   Ensures compatibility with **namespace hosting** on DataCite, allowing external tools to reference individual enumeration terms directly.
    

----------

## Context Hierarchy and Enumerations

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
  "@context": "https://schema.stage.datacite.org/linked-data/context/fullcontext.jsonld",
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

Once deployed, each profile is also fetchable at its `$id` URL — e.g. `https://schema.stage.datacite.org/linked-data/schema-profiles/integrated.json` — so validators can resolve `$ref`s remotely without a local copy.

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

## Version History

### DataCite 4.6 (current vocabulary baseline)

Introduces or updates several controlled values:

- **`resourceTypeGeneral`**: adds **`Project`**, **`Award`**
- **`relatedIdentifierType`**: adds **`RRID`**, **`CSTR`**
- **`contributorType`**: adds **`Translator`**
- **`relationType`**: adds the pair **`IsTranslationOf` / `HasTranslation`**
- **`dateType`**: adds **`Coverage`**

### DataCite 4.7 (next upgrade target)

Use the [Detect → Review → Apply pipeline](#upgrading-to-a-new-datacite-version) to upgrade. Expected changes from 4.6:

- **`resourceTypeGeneral`**: adds **`Poster`**, **`Presentation`**
- **`relatedIdentifierType`**: adds **`RAiD`**, **`SWHID`**
- **`relationType`**: adds **`Other`**
- New property **`relationTypeInformation`** (sub-property of `relatedIdentifier` and `relatedItem`)

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

**To use the schema for validation:**
- Validate submission JSON with the root schema in `validation-and-conversion/schemas/schema-profiles/datacite4.6-profile.json`
- Validate API responses with the `responseProfile` inside the same file
- Explore the SKOS/JSKOS crosswalks in `mappings/` to connect DataCite terms with Schema.org and DCAT

**To upgrade the vocabulary to a newer version:**
1. Run `node rdf-build-scripts/detect-datacite-release.js` (or the GitHub Actions workflow)
2. Edit `reports/release-import-plan-<version>.json` — change `"proposed"` → `"apply"` for each desired change
3. Run `node rdf-build-scripts/apply-datacite-release-plan.js --plan reports/release-import-plan-<version>.json --set-current`

See the [Upgrading to a New DataCite Version](#upgrading-to-a-new-datacite-version) section for the full walkthrough.

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
