# convert_jskos.py
#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from urllib.parse import quote

# Paths
input_path  = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("SKOScrosswalk.jsonld")
output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("jskos-mappings.ndjson")

# Prefixes to expand CURIEs
prefixes = {
    "schema": "http://schema.org/",
    "dcterms": "http://purl.org/dc/terms/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "wd": "http://www.wikidata.org/entity/",
    "dcat": "http://www.w3.org/ns/dcat#"
}

def expand(curie):
    """
    Expand a CURIE (e.g. schema:identifier) to a full IRI.
    If it's already an absolute IRI, return unchanged.
    """
    if isinstance(curie, str) and ":" in curie and not curie.startswith("http"):
        pre, local = curie.split(":", 1)
        base = prefixes.get(pre)
        if base:
            return base + local
    return curie

# Load the JSON-LD
with input_path.open('r', encoding='utf-8') as file:
    data  = json.load(file)
    graph = data.get("@graph", [])

# Which SKOS predicates to turn into JSKOS mappings
mapping_predicates = [
    "skos:exactMatch", "skos:closeMatch", "skos:broadMatch",
    "skos:narrowMatch", "skos:relatedMatch"
]

predicate_to_typeuri = {
    "skos:exactMatch":  "http://www.w3.org/2004/02/skos/core#exactMatch",
    "skos:closeMatch":  "http://www.w3.org/2004/02/skos/core#closeMatch",
    "skos:broadMatch":  "http://www.w3.org/2004/02/skos/core#broadMatch",
    "skos:narrowMatch": "http://www.w3.org/2004/02/skos/core#narrowMatch",
    "skos:relatedMatch":"http://www.w3.org/2004/02/skos/core#relatedMatch"
}

jskos_mappings = []
for item in graph:
    if item.get("@type") == "skos:Concept":
        raw_id   = item.get("@id")
        local_id = raw_id.split(":")[-1]
        concept_uri = f"https://selgebali.github.io/datacite4.6-jsonld/main_context.jsonld#{local_id}"
        for predicate in mapping_predicates:
            if predicate in item:
                for target in (item[predicate] if isinstance(item[predicate], list) else [item[predicate]]):
                    # Determine and expand target URI
                    if isinstance(target, dict):
                        uri = target.get("@id") or target.get("id")
                    else:
                        uri = target
                    uri = expand(uri)

                    # Skip broken entries
                    if not concept_uri or not uri:
                        print(f"⚠️ Skipping mapping from {concept_uri} to invalid target: {target}")
                        continue

                    # Generate a unique identifier fragment
                    predicate_label = predicate.split(":")[1]
                    frag = f"{local_id}--{predicate_label}--{uri}".replace(":", "_").replace("/", "_")
                    identifier = f"https://selgebali.github.io/datacite4.6-jsonld/jskos-mappings.json#{quote(frag)}"

                    jskos_mappings.append({
                        "from":     {"memberSet":[{"uri": concept_uri}]},
                        "to":       {"memberSet":[{"uri": uri}]},
                        "type":     [predicate_to_typeuri[predicate]],
                        "creator":  [{"uri":"https://github.com/selgebali"}],
                        "created":  "2025-07-24T00:00:00Z",
                        "identifier":[identifier]
                    })

# Write out NDJSON (one mapping per line)
with output_path.open('w', encoding='utf-8') as out:
    for mapping in jskos_mappings:
        out.write(json.dumps(mapping, ensure_ascii=False) + "\n")