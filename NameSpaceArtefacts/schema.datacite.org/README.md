*	**class/** – definitions of major schema entities (e.g., Identifier, Creator, Title).  Each file in this folder defines an entity IRI such as https://schema.datacite.org/class/Identifier.

*	**context/** – JSON‑LD context files used to map short prefixes to IRIs (e.g., datacite.jsonld).
*   **context/datacite_api.json** -  This context is designed to translate the DataCite REST API’s JSON into an RDF graph.
    * First profile (starting ~line 727): Comprehensive ontology profile -  Full semantic mapping to DataCite 4.6 ontology. Best for semantic web applications, ontology reasoning, and complete DataCite compliance

    * responseProfile (starting ~line 1337): JSON:API response validation schema

    * submitProfile (starting ~line 1403): JSON:API submission validation schema

*	**manifest/** – manifest files that list all classes, properties and vocabularies available in a specific schema version, registry of resolvable things (tbd: along with example metadata records.)

*	**property/** – definitions of all schema properties and sub‑properties.  Each file here defines an IRI such as https://schema.datacite.org/property/givenName.

*	**vocab/** – controlled lists (enumerations) referenced by properties.  These are grouped by version (e.g., vocab/datacite-4.6/).  Each file in this folder defines a set of terms with stable IRIs.

