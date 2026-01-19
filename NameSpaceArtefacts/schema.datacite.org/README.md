*	**class/** – definitions of major schema entities (e.g., Identifier, Creator, Title).  Each file in this folder defines an entity IRI such as https://schema.datacite.org/class/Identifier.

*	**context/** – JSON‑LD context files used to map short prefixes to IRIs (e.g., datacite.jsonld).

*	**manifest/** – manifest files that list all classes, properties and vocabularies available in a specific schema version, registry of resolvable things (tbd: along with example metadata records.)

*	**property/** – definitions of all schema properties and sub‑properties.  Each file here defines an IRI such as https://schema.datacite.org/property/givenName.

*	**vocab/** – controlled lists (enumerations) referenced by properties.  These are grouped by version (e.g., vocab/datacite-4.6/).  Each file in this folder defines a set of terms with stable IRIs.