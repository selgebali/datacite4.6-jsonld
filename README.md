# datacite4.6-jsonld
DataCite 4.6 JSON-LD &amp; SKOS crosswalks JSON-LD context and JSON-Schema (“rules.json”) for the DataCite Kernel 4.6 XML schema, plus SKOS &amp; SSSOM &amp; JSKOS mappings to Schema.org and DCAT.
# DataCite 4.6 JSON-LD & SKOS Crosswalks
The DataCite Metadata Schema is widely used to register DOIs and describe research datasets and other research objects.  To make DataCite metadata more interoperable, the SKOS crosswalk provided in SKOScrosswalk.jsonld links each DataCite element to equivalent or related terms in Schema.org, DCAT, Dublin Core Terms (DCTERMS) and Wikidata.  Each concept in the graph contains a preferred label and definition and may specify skos:exactMatch, skos:closeMatch, skos:broadMatch, skos:narrowMatch or skos:relatedMatch to indicate similarity with terms in external vocabularies.

# This repository provides:

Datacite4.6-profile.json (Bundled profile with rules, vocabularies and context) This can be used for:

## Structure validation
- Required field checking
- Controlled vocabulary validation
- Basic type checking

## Semantic Usage:
- Linked Data integration
- Schema.org alignment
- DCAT compatibility


##  SKOS concept schemes (DataCite 4.6) and JSKOS crosswalks to:
   - Schema.org
   - W3C DCAT
----
