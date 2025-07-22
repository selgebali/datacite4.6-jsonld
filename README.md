# datacite4.6-jsonld
DataCite 4.6 JSON-LD &amp; SKOS crosswalks JSON-LD context and JSON-Schema (“rules.json”) for the DataCite Kernel 4.6 XML schema, plus SKOS &amp; SSSOM &amp; JSKOS mappings to Schema.org and DCAT.
# DataCite 4.6 JSON-LD & SKOS Crosswalks

This repository provides:

1. **`manual_metadata.jsonld`** – A JSON-LD 1.1 context exposing every element, attribute, simpleType, complexType and controlled‐vocabulary list from the DataCite Kernel 4.6 XSD.  
2. **`rules.json`** – A companion JSON-Schema that references `manual_metadata.jsonld` as its `$id`/`$schema`, and defines required properties, min/max occurrences, patterns, etc.
3. **`docs/`** – A GitHub Pages site hosting `manual_metadata.jsonld` and `rules.json` under stable URLs:
   - `https://selgebali.github.io/datacite4.6-jsonld/manual_metadata.jsonld`  
   - `https://selgebali.github.io/datacite4.6-jsonld/rules.json`
4. **`skos-mappings/`** – SKOS concept schemes (DataCite 4.6) and JSKOS crosswalks to:
   - Schema.org
   - W3C DCAT

## Usage

### As a JSON-LD context

Include in your JSON-LD documents:

```json
{
  "@context": "https://selgebali.github.io/datacite4.6-jsonld/manual_metadata.jsonld",
  "@type": "resource",
  "identifier": "doi:10.1234/example",
  "identifierType": "DOI",
  ...
}
```
## Validating with JSON-Schema
```
ajv validate \
  --schema=https://selgebali.github.io/datacite4.6-jsonld/rules.json \
  --data=your-data.json
```
