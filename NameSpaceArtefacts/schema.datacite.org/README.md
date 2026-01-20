*	**class/** – definitions of major schema entities (e.g., Identifier, Creator, Title).  Each file in this folder defines an entity IRI such as https://schema.datacite.org/class/Identifier.

*	**context/** – JSON‑LD context files used to map short prefixes to IRIs (e.g., datacite.jsonld).
*   **context/datacite_api.json** -  This context is designed to translate the DataCite REST API’s JSON into an RDF graph.

*	**manifest/** – manifest files that list all classes, properties and vocabularies available in a specific schema version, registry of resolvable things (tbd: along with example metadata records.)

*	**property/** – definitions of all schema properties and sub‑properties.  Each file here defines an IRI such as https://schema.datacite.org/property/givenName.

*	**vocab/** – controlled lists (enumerations) referenced by properties.  These are grouped by version (e.g., vocab/datacite-4.6/).  Each file in this folder defines a set of terms with stable IRIs.

----
Detailed information
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
----