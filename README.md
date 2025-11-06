# DataCite 4.6 JSON‑LD Profile & Beginner’s Guide

Welcome to the DataCite 4.6 JSON‑LD Profile repository. This resource provides a **self‑contained JSON Schema** alongside an embedded **JSON‑LD `@context`** for the **DataCite Metadata Schema v4.6**, fully aligned with the **DataCite REST API**. It enables you to (1) validate your metadata submission payloads before sending them to the API, and (2) interpret the same JSON as **linked data** for semantic applications.

If you are new to metadata schemas, linked data, or DataCite itself, don’t worry. This guide will walk you through the key concepts, the files included here, and exactly how to use them step by step.

---

## Why This Matters: A Beginner’s Perspective

Metadata is essentially “data about data.” For research data and persistent identifiers (PIDs) like DOIs, having consistent and well-structured metadata is critical. It helps researchers discover, cite, and reuse datasets reliably. Without good metadata, research outputs risk being lost or misunderstood.

JSON (JavaScript Object Notation) is a lightweight, human-readable format commonly used to represent data structures. JSON-LD (JSON for Linked Data) extends JSON by adding semantic context through namespaces—unique web identifiers called IRIs—that provide clear, unambiguous meanings to each data element. This semantic layer allows data to be linked and integrated across different systems and knowledge graphs.

DataCite is a leading organization that assigns DOIs for research outputs and defines a metadata schema to describe those outputs consistently. Metadata Schema v4.6 specifies which fields to include, allowed values, and how to represent the data.

Validation and semantics serve different but complementary roles. JSON Schema checks the structure of your metadata—ensuring required fields exist, values follow expected formats, and no unexpected fields appear. JSON-LD adds semantic meaning by mapping JSON keys to globally recognized identifiers, enabling machines to understand the data beyond its shape.

This repository bridges these two worlds. It offers a JSON Schema to validate your DataCite metadata payloads before submission and embeds a JSON-LD `@context` that links the same JSON keys to semantic IRIs. This means your data is both syntactically correct and semantically interoperable, ready for API submission and linked data applications.

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
    
  ### **docs/datacite4.6-profile.json**

### **(root “submit” profile)**

-   Validates **client-submitted** metadata — used for POST/PUT requests to the DataCite REST API.
    
-   Strict by design ("additionalProperties": false), so it flags missing or extra fields and format errors early.
    
-   Embeds a **profile.@context** that maps JSON properties to semantic IRIs (DataCite and selected external vocabularies).
    
-   Includes key **controlled vocabularies** under $defs (e.g., resourceTypeGeneral, contributorType, relationType) as enumerations with fragment IRIs for semantic reuse.
    

----------

### **responseProfile**

### **(schema object within the same file)**

-   Validates **API responses** wrapped in a **JSON:API** envelope (data.id, data.type="dois", data.attributes, etc.).
    
-   Designed to be **permissive**, allowing server-added read-only and analytics fields such as url, state, viewCount, and created.
    

  

> Think of these as **what you send in** versus **what you get back** — both defined in the same bundled schema.

----------

### **exportProfile**

### **(added in this release)**

-   Defines how to transform validated DataCite JSON into RDF-ready **JSON-LD**.
    
-   Includes explicit **language-tag conversion rules** (turning {text, lang} pairs into @language literals).
    
-   Specifies DOI-to-IRI construction (https://doi.org/<doi>), ensuring graph-consistent identifiers.
    
-   Enables generation of **graph-native metadata** that remains compatible with the DataCite API structure.
    

----------

### **SKOS/JSKOS Crosswalks (e.g.,SKOScrosswalk.jsonld)**

-   Map DataCite terms to external vocabularies such as **Schema.org**, **DCAT**, **DCTERMS**, and **Wikidata** for semantic interoperability.
    
-   Typically maintained as **separate linked files**, not embedded directly in the profile, but aligned with its $defs and profile.@context IRIs.

----------

### **Intended Usage**

-   Acts as the **authoritative, machine-actionable bundle** for NFDI and DataCite interoperability efforts.
    
-   Supports both **validation workflows** (API clients, metadata monitors) and **semantic export workflows** (crosswalk registries, FDO type systems).
    
-   Optimized for integration into **metadata schema registries**, **PID graph services**, and **cross-domain mapping systems** like MSCR or TS4NFDI.
  

## Glossary: Key Terms Explained

- **JSON Schema**: A machine-readable specification describing the **shape** of a JSON document—what fields are required, allowed values, formats, and data types.  
- **JSON‑LD**: “JSON for Linked Data” allows you to attach **semantic meanings** to JSON keys via an **`@context`**, so different systems can agree on what each field means.  
- **SKOS**: A W3C standard for modeling **controlled vocabularies** and linking terms across vocabularies (e.g., indicating “exact match,” “broader,” or “narrower” relationships).  
- **Ontology / Crosswalk**: A **mapping** between vocabularies or standards—for example, connecting DataCite’s `publisher` field to Schema.org’s `schema:publisher`.

---

## What’s New in DataCite 4.6 (Highlights)

DataCite 4.6 introduces or updates several controlled values and types reflected in this profile:

- **`resourceTypeGeneral`**: adds **`Project`**, **`Award`**  
- **`relatedIdentifierType`**: adds **`RRID`**, **`CSTR`**  
- **`contributorType`**: adds **`Translator`**  
- **`relationType`**: adds the pair **`IsTranslationOf` / `HasTranslation`**  
- **`dateType`**: adds **`Coverage`**

These updates ensure alignment with the official 4.6 schema and may differ from older examples or tutorials.

---

## Installation / Setup

You only need Python if you want to run local validation:

```bash
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install jsonschema
```

Any JSON Schema validator supporting **draft‑07** will work.

---

## Usage Overview: Two Core Paths

This section explains how to use the bundled schema for both submission validation and response validation. Both **submitProfile** and **responseProfile** are part of the same bundled file (`docs/datacite4.6-profile.json`).

### 1) Validate a Submission Payload

Use this to check your JSON metadata before sending it to the DataCite REST API (POST/PUT):

```python
import json
from jsonschema import Draft7Validator

schema = json.load(open("docs/datacite4.6-profile.json"))
payload = json.load(open("example-submit.json"))  # your metadata

Draft7Validator(schema).validate(payload)
print("OK: submission payload is valid")
```

**Minimal valid submission example:**

```jsonc
{
  "doi": "10.1234/example-doi",
  "creators": [
    {
      "name": "Doe, Jane",
      "nameType": "Personal"
    }
  ],
  "titles": [
    {
      "title": "An Example Dataset"
    }
  ],
  "publisher": {
    "name": "Example University"
  },
  "publicationYear": "2025",
  "types": {
    "resourceTypeGeneral": "Dataset"
  }
}
```

> Tip: The submit schema enforces patterns (e.g., DOI regex) and cardinality (e.g., `creators` and `titles` must not be empty).

### 2) Validate a Response Envelope

Use this to validate JSON:API responses returned by the DataCite API (GET /dois/:id):

```python
import json
from jsonschema import Draft7Validator

doc = json.load(open("docs/datacite4.6-profile.json"))
resp = json.load(open("datacite_example_filledin.json"))

Draft7Validator(doc["responseProfile"]).validate(resp)
print("OK: response envelope looks good")
```

**Example response (JSON:API format):**

```json
{
  "data": {
    "id": "10.1234/example-doi",
    "type": "dois",
    "attributes": {
      "doi": "10.1234/example-doi",
      "creators": [
        {
          "name": "Doe, Jane"
        }
      ],
      "titles": [
        {
          "title": "An Example Dataset"
        }
      ],
      "publisher": "Example University",
      "publicationYear": 2025,
      "types": {
        "resourceTypeGeneral": "Dataset"
      },
      "url": "https://example.org/data/1234",
      "state": "findable"
    }
  }
}
```

> Note: API responses may include **ORCID as a URL** (e.g., `"https://orcid.org/0000-0002-1825-0097"`). The **submit** schema expects the **bare format** for ORCID when used in `nameIdentifiers`.

---

## How the JSON‑LD `@context` Helps

Inside `docs/datacite4.6-profile.json`, the `profile.@context` section maps JSON keys to IRIs. This mapping allows the same JSON to be converted into RDF for linked data applications.

Examples:

```json
"doi": { "@id": "datacite:identifier", "@type": "@id" }
```

This treats the DOI as a global identifier (IRI). Another example:

```json
"publisher": { "@id": "datacite:publisher" }
```

Applications can understand that `publisher` aligns with DataCite’s concept of a publisher. You can also map it to Schema.org:

- `publisher` → `datacite:publisher`  
- `publisher` → `schema:publisher`

---

## SKOS Crosswalks (DataCite ⇄ External Vocabularies)

The SKOS/JSKOS files provide **crosswalks** that link DataCite elements to external vocabularies such as Schema.org, DCAT, DCTERMS, and Wikidata. These mappings help search engines, catalogues, and graph tools interpret your metadata consistently.

**Conceptual example:**

```jsonc
{
  "skos:prefLabel": "publisher",
  "skos:exactMatch": [
    "https://schema.org/publisher",
    "https://purl.org/dc/terms/publisher"
  ]
}
```

This indicates that DataCite’s `publisher` corresponds precisely to these external terms.

---

## Troubleshooting & Tips

- **Submission fails but response validates**  
  You might be validating a response with the strict submit schema. Use `responseProfile` for response validation.

- **ORCID pattern errors**  
  For submission, use the bare ORCID format (`0000-0000-0000-0000` with checksum). Responses may present ORCID as a full URL, which is allowed by `responseProfile`.

- **Unexpected property errors**  
  The submit schema is strict. Remove any fields not listed or add them under the correct nested object.

- **Cardinality**  
  Arrays like `creators` and `titles` must have **at least one** entry. Nested objects often require specific pairs (e.g., if `affiliationIdentifier` is present, then `affiliationIdentifierScheme` must be too).

- **Dates and numbers**  
  Follow schema hints for formats, such as ISO‑8601 for dates and numeric ranges for geographic coordinates.

---

## FAQ

**Q: What’s the difference between `identifiers` and `alternateIdentifiers`?**  
- `identifiers`: Additional or internal identifiers (ISBN, Handle, local IDs).  
- `alternateIdentifiers`: True alternates like PubMed ID or another primary ID used elsewhere.

**Q: Do I need the JSON‑LD `@context` to submit to the API?**  
No. The API accepts plain JSON. The `@context` is included here to support **semantic interoperability**—useful for indexing, knowledge graph ingestion, and cross-platform alignment.

**Q: Which JSON Schema draft is used?**  
Draft‑07. Use a validator that supports this version.

**Q: Can I extend the schema?**  
You can fork or extend it, but the submit profile is intentionally strict to match the API and DataCite 4.6. For custom fields, consider **profiles** layered on top of DataCite rather than modifying the core schema.

---

## References (Authoritative Sources)

- DataCite: **Metadata Schema 4.6** — https://schema.datacite.org/meta/kernel-4.6/  
- DataCite: **REST API docs** — https://support.datacite.org/docs/api  
- DataCite: **4.6 Release Notes** — https://support.datacite.org/docs/datacite-metadata-schema-46-release-notes  
- JSON Schema — https://json-schema.org/  
- JSON‑LD — https://json-ld.org/  
- SKOS Primer — https://www.w3.org/TR/skos-primer/

---

## Next Steps

- Start by validating your **submission** JSON with the root schema (`docs/datacite4.6-profile.json`).  
- Validate your **responses** with the `responseProfile` inside the same file.  
- Explore the SKOS/JSKOS crosswalks to connect DataCite terms with Schema.org and DCAT, improving interoperability downstream.

---

## datacite4.6-profile.json

This bundled profile for DataCite 4.6 contains:

- A root JSON Schema for the attributes you submit to the REST API.  
- A JSON-LD context (under `profile.@context`) that gives those attributes semantic meaning.  
- A response schema for validating JSON:API responses.  
- A submission schema for validating JSON:API requests.  
- Centralized enumerations with IRIs (under `$defs`) to bridge validation and semantics.

With this bundle, you can:

- Validate and interpret metadata locally.  
- Generate machine-actionable contexts automatically.  
- Keep schema and ontology consistency in one versioned artifact.

---

Together, these components provide a comprehensive, beginner-friendly toolkit that ensures your DataCite metadata is both syntactically valid and semantically rich—ready for submission, interpretation, and integration into linked data ecosystems.
