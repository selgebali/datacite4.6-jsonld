#!/usr/bin/env python3
import json, sys
from pathlib import Path
from urllib.parse import quote

# CLI paths
input_path  = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("SKOScrosswalk.jsonld")
output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("jskos-mappings.json")

# Prefix map
prefixes = {
    "schema": "http://schema.org/",
    "dcterms": "http://purl.org/dc/terms/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "wd": "http://www.wikidata.org/entity/",
    "dcat": "http://www.w3.org/ns/dcat#"
}
def expand(curie):
    if isinstance(curie, str) and ":" in curie and not curie.startswith("http"):
        pre, local = curie.split(":", 1)
        return prefixes.get(pre, "") + local if prefixes.get(pre) else curie
    return curie

predicate_to_typeuri = {
    "skos:exactMatch":  prefixes["skos"] + "exactMatch",
    "skos:closeMatch":  prefixes["skos"] + "closeMatch",
    "skos:broadMatch":  prefixes["skos"] + "broadMatch",
    "skos:narrowMatch": prefixes["skos"] + "narrowMatch",
    "skos:relatedMatch":prefixes["skos"] + "relatedMatch"
}

# Read JSON-LD
data = json.loads(input_path.read_text(encoding="utf-8"))
graph = data.get("@graph", [])

jskos_mappings = []

for item in graph:
    if item.get("@type") == "skos:Concept" or "skos:Concept" in item.get("@type", []):
        raw_id = item.get("@id", "")
        local = raw_id.split(":")[-1]
        concept_uri = f"https://selgebali.github.io/datacite4.6-jsonld/main_context.jsonld#{local}"
        for pred in predicate_to_typeuri:
            if pred in item:
                targets = item[pred] if isinstance(item[pred], list) else [item[pred]]
                for t in targets:
                    uri = expand(t.get("@id") or t.get("id") if isinstance(t, dict) else t)
                    if not uri:
                        print(f"⚠️ Skipping {raw_id} → bad target {t}")
                        continue
                    frag = quote(f"{local}--{pred.split(':')[1]}--{uri}")
                    mapping_id = f"{concept_uri}--mapping--{frag}"
                    jskos_mappings.append({
                        "uri": mapping_id,
                        "from":    { "uri": concept_uri },
                        "to":      { "uri": uri },
                        "type":    [ predicate_to_typeuri[pred] ],
                        "creator": [ { "uri": "https://github.com/selgebali" } ],
                        "created": "2025-07-24T00:00:00Z"
                    })

# Wrap final output
output_data = {
    "@context": "https://gbv.github.io/jskos/context.json",
    "mappings": jskos_mappings
}

# Write JSON
output_path.write_text(json.dumps(output_data, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {len(jskos_mappings)} mappings to {output_path}")
