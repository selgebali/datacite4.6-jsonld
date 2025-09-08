# DataCite 4.6 JSON‑LD Profile & Beginner’s Guide

This repository contains a **self‑contained JSON Schema** and an embedded **JSON‑LD `@context`** for **DataCite Metadata Schema v4.6**, aligned with the **DataCite REST API**. It lets you (1) validate submission payloads before sending them to the API and (2) interpret the same JSON as **linked data**.

If you’re new to schemas, linked data, or DataCite: don’t worry. This guide walks you through the concepts, the files in this repo, and exactly how to use them step by step.

---

## Why this matters (beginner background)

Metadata is “data about data.” For DOIs and research objects, **consistent metadata** is critical for discovery, citation, and reuse. The DataCite 4.6 schema defines **what fields exist**, **which are required**, and **which controlled values** are allowed (e.g., resource types and relation types).  
This repository adds two big things:

1) **Validation**:  using **JSON Schema** to confirm your JSON is structurally correct and meets required/controlled fields.  
2) **Semantic meaning**:  using **JSON‑LD** so your JSON keys can be mapped to **IRIs** (web identifiers) and integrated into **knowledge graphs**.

---

## What’s in this repository

- **`docs/datacite4.6-profile.json`** (root “submit” profile)  
  - Validates **client‑submitted** metadata (POST/PUT to the DataCite REST API).  
  - Strict by design (`"additionalProperties": false`), so it flags missing/extra fields and format errors.  
  - Embeds an **`@context`** (under `profile`) that maps JSON properties to semantic IRIs (DataCite + selected external vocabularies).  
  - Inlines the key **controlled vocabularies** (e.g., `resourceTypeGeneral`, `contributorType`, `relationType`, etc.) with enumerations.
- **`responseProfile`** (a schema object inside the same file)  
  - Validates **API responses** that come in a **JSON:API** envelope (`data.id`, `data.type="dois"`, `data.attributes`, …).  
  - Permissive for attributes (allows read‑only and analytics fields the API adds like `url`, `state`, `viewCount`, `created`).

> Think of it as **what you send in** vs **what you get back**.

- **SKOS/JSKOS crosswalks** (e.g., `SKOScrosswalk.jsonld`)  
  - Map DataCite terms to external vocabularies (Schema.org, DCAT, DCTERMS, Wikidata) to improve interoperability.

---

## Glossary (plain‑language)

- **JSON Schema**: A machine‑readable way to describe the **shape** of a JSON document: which fields are required, allowed values, formats, and types.  
- **JSON‑LD**: “JSON for Linked Data”, lets you attach **semantic meanings** to JSON keys via an **`@context`** so different systems agree on what a field means.  
- **SKOS**: A W3C standard to model **controlled vocabularies** and to link terms across vocabularies (e.g., “exact match”, “broader”, “narrower”).  
- **Ontology / Crosswalk**: A **mapping** between vocabularies/standards—e.g., connecting DataCite’s `publisher` to Schema.org’s `schema:publisher`.

---

## What’s new in DataCite 4.6 (highlights)

DataCite 4.6 adds/updates several controlled values and types that you’ll see in this profile:

- **`resourceTypeGeneral`**: adds **`Project`**, **`Award`**  
- **`relatedIdentifierType`**: adds **`RRID`**, **`CSTR`**  
- **`contributorType`**: adds **`Translator`**  
- **`relationType`**: adds the pair **`IsTranslationOf` / `HasTranslation`**  
- **`dateType`**: adds **`Coverage`**

These ensure alignment with the official 4.6 schema and may differ from older examples/tutorials.

---

## Install / set up

You only need Python if you want to run local validation:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install jsonschema
```

(Any JSON Schema validator that supports **draft‑07** will work.)

---

## Usage overview (two core paths)

1) **Prepare and validate a submission payload** (your JSON for POST/PUT).  
2) **Validate a response** (the JSON:API envelope returned by GET /dois/:id).

### 1) Validate a submission

```python
import json
from jsonschema import Draft7Validator

schema = json.load(open("docs/datacite4.6-profile.json"))
payload = json.load(open("example-submit.json"))  # your metadata

Draft7Validator(schema).validate(payload)
print("OK: submission payload is valid")
```

**Minimal valid submission example** (comments for learning—remove `//` for real use):

```jsonc
{
  "doi": "10.1234/example-doi",                 // Required DOI
  "creators": [                                 // At least one creator
    {
      "name": "Doe, Jane",
      "nameType": "Personal"                    // Controlled: Personal|Organizational
    }
  ],
  "titles": [{ "title": "An Example Dataset" }],// At least one title
  "publisher": { "name": "Example University" },
  "publicationYear": "2025",
  "types": { "resourceTypeGeneral": "Dataset" } // Controlled vocabulary
}
```

> Tip: The submit schema enforces patterns (e.g., DOI regex) and cardinality (e.g., `creators` and `titles` must not be empty).

### 2) Validate a response envelope

```python
import json
from jsonschema import Draft7Validator

doc = json.load(open("docs/datacite4.6-profile.json"))
resp = json.load(open("datacite_example_filledin.json"))

Draft7Validator(doc["responseProfile"]).validate(resp)
print("OK: response envelope looks good")
```

**Response example (JSON:API)**:

```json
{
  "data": {
    "id": "10.1234/example-doi",
    "type": "dois",
    "attributes": {
      "doi": "10.1234/example-doi",
      "creators": [{ "name": "Doe, Jane" }],
      "titles": [{ "title": "An Example Dataset" }],
      "publisher": "Example University",
      "publicationYear": 2025,
      "types": { "resourceTypeGeneral": "Dataset" },
      "url": "https://example.org/data/1234",
      "state": "findable"
    }
  }
}
```

> Note: API responses may include **ORCID as a URL** (e.g., `"https://orcid.org/0000-0002-1825-0097"`). The **submit** schema expects the **bare format** for ORCID when used in `nameIdentifiers`.

---

## How the JSON‑LD `@context` helps

Inside `docs/datacite4.6-profile.json`, the `profile.@context` maps JSON keys to IRIs so the same JSON can be converted into RDF for linked data use.

Examples:

```json
"doi": { "@id": "datacite:identifier", "@type": "@id" }
```

This treats the DOI as a global identifier (IRI). Another example:

```json
"publisher": { "@id": "datacite:publisher" }
```

Now applications can understand that `publisher` aligns with the DataCite notion of a publisher, and you can **also** map it to Schema.org:

- `publisher` → `datacite:publisher`  
- `publisher` → `schema:publisher`

---

## SKOS crosswalks (DataCite ⇄ external vocabularies)

The SKOS/JSKOS files provide a **crosswalk** that links DataCite elements to **Schema.org**, **DCAT**, **DCTERMS**, and **Wikidata**. This allows search engines, catalogues, and graph tools to interpret your metadata consistently.

**Example idea** (conceptual):

```jsonc
{
  "skos:prefLabel": "publisher",
  "skos:exactMatch": [
    "https://schema.org/publisher",          // schema:publisher
    "https://purl.org/dc/terms/publisher"    // dcterms:publisher
  ]
}
```

This indicates that *DataCite’s* `publisher` corresponds to these external terms.

---

## Troubleshooting & tips

- **Submission fails but response validates**: You’re probably validating a response with the strict submit schema. Use `responseProfile` for responses.  
- **ORCID pattern errors**: For submission, use `0000-0000-0000-0000` style (with checksum). Responses may present ORCID as a full URL—allowed by `responseProfile`.  
- **Unexpected property errors**: The submit schema is strict. Remove any fields not listed in the schema or add them under the correct nested object.  
- **Cardinality**: Arrays like `creators`, `titles` must have **at least one** entry; nested objects often require specific pairs (e.g., if `affiliationIdentifier` then `affiliationIdentifierScheme`).  
- **Dates and numbers**: Where formats are constrained, follow the hints in the schema (e.g., ISO‑8601 for dates; numeric ranges for geo coordinates).

---

## FAQ

**Q: What’s the difference between `identifiers` and `alternateIdentifiers`?**  
- `identifiers`: Additional/internal identifiers (ISBN, Handle, local IDs).  
- `alternateIdentifiers`: True alternates like PubMed ID or another primary ID used elsewhere.

**Q: Do I need the JSON‑LD `@context` to submit to the API?**  
No. The API accepts plain JSON. The `@context` is included here to support **semantic interoperability**—useful for indexing, KG ingestion, and cross‑platform alignment.

**Q: Which JSON Schema draft is used?**  
Draft‑07. Use a validator that supports it.

**Q: Can I extend the schema?**  
You can fork/extend, but the submit profile is intentionally strict to match the API and DataCite 4.6. If you add custom fields, consider **profiles** layered on top of DataCite, not changes inside it.

---

## References (authoritative sources)

- DataCite: **Metadata Schema 4.6** — https://schema.datacite.org/meta/kernel-4.6/  
- DataCite: **REST API docs** — https://support.datacite.org/docs/api  
- DataCite: **4.6 Release Notes** — https://support.datacite.org/docs/datacite-metadata-schema-46-release-notes  
- JSON Schema — https://json-schema.org/  
- JSON‑LD — https://json-ld.org/  
- SKOS Primer — https://www.w3.org/TR/skos-primer/

---

## Next steps

- Validate your **submission** JSON with the root schema (`docs/datacite4.6-profile.json`).  
- Validate your **responses** with `responseProfile`.  
- Explore the SKOS/JSKOS crosswalks to connect DataCite terms with Schema.org/DCAT and improve interoperability downstream.

---