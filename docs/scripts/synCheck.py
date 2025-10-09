

#!/usr/bin/env python3
"""
Sync check between bundle $defs enums and enum_lists JSON-LD files.

What it verifies for each $defs entry that has both `enum` and `iriMap`:
  1) The set of terms in $defs.enum == set($defs.iriMap.keys()).
  2) The enum JSON-LD file referenced by iriMap contains the exact same set of terms.
  3) The iriMap values use the expected base URL and filename from enum_lists.

Exit code: 0 when all checks pass, 1 otherwise.

Usage:
  python3 docs/scripts/synCheck

(Or make it executable: `chmod +x docs/scripts/synCheck` and run `docs/scripts/synCheck`.)
"""

import json
import os
import re
import sys
from urllib.parse import urlparse, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROFILE_PATH = os.path.join(ROOT, "docs", "datacite4.6-profile.json")
ENUM_DIR = os.path.join(ROOT, "docs", "enum_lists")
EXPECTED_BASE = "https://selgebali.github.io/datacite4.6-jsonld/enum_lists/"


errors = []

# Normalize known fragment aliases and ignore scheme container nodes
ALIAS_FRAGMENTS = {
    "CrossrefFunderID": "Crossref Funder ID",
}
IGNORE_SUFFIXES = ("Scheme",)

# Helpers

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def iri_filename(iri: str) -> str:
    """Return the enum JSON-LD filename from a full IRI (…/enum_lists/<file>.jsonld#Term)."""
    try:
        p = urlparse(iri)
        fname = os.path.basename(p.path)
        if not fname.endswith(".jsonld"):
            raise ValueError(f"IRI does not end with .jsonld path: {iri}")
        return fname
    except Exception as e:
        raise ValueError(f"Cannot parse IRI '{iri}': {e}")


def extract_terms_from_jsonld(jsonld_path: str):
    data = load_json(jsonld_path)
    graph = data.get("@graph", [])
    terms = set()
    for node in graph:
        term_id = node.get("@id")
        if not term_id:
            continue
        # Determine candidate term from @id
        candidate = None
        if ":" in term_id and not term_id.startswith("http"):
            candidate = term_id.split(":", 1)[1]
        else:
            if "#" in term_id:
                candidate = term_id.rsplit("#", 1)[1]
            else:
                candidate = os.path.basename(term_id)

        # URL-decode and normalize
        candidate = unquote(candidate)
        # Skip scheme container nodes like ResourceTypeGeneralScheme, etc.
        if candidate.endswith(IGNORE_SUFFIXES):
            continue
        # Apply known alias mappings
        candidate = ALIAS_FRAGMENTS.get(candidate, candidate)
        if candidate:
            terms.add(candidate)
    return terms


def check_defs_enum(def_key: str, def_obj: dict):
    local_errors = []

    enum_terms = def_obj.get("enum")
    iri_map = def_obj.get("iriMap")

    if not isinstance(enum_terms, list) or not isinstance(iri_map, dict):
        return []  # Not a target enum def

    enum_set = set(enum_terms)
    iri_keys = set(iri_map.keys())

    # 1) enum vs iriMap keys must match
    if enum_set != iri_keys:
        missing_in_iri = enum_set - iri_keys
        missing_in_enum = iri_keys - enum_set
        if missing_in_iri:
            local_errors.append(f"[{def_key}] iriMap missing terms: {sorted(missing_in_iri)}")
        if missing_in_enum:
            local_errors.append(f"[{def_key}] enum missing terms: {sorted(missing_in_enum)}")

    # 2) Determine enum file from the first iri value and compare JSON-LD terms
    try:
        sample_iri = next(iter(iri_map.values()))
    except StopIteration:
        local_errors.append(f"[{def_key}] iriMap is empty")
        return local_errors

    try:
        enum_file = iri_filename(sample_iri)
    except ValueError as e:
        local_errors.append(f"[{def_key}] {e}")
        return local_errors

    enum_path = os.path.join(ENUM_DIR, enum_file)
    if not os.path.isfile(enum_path):
        local_errors.append(f"[{def_key}] enum JSON-LD file not found: {enum_path}")
        return local_errors

    jsonld_terms = extract_terms_from_jsonld(enum_path)

    if enum_set != jsonld_terms:
        missing_in_jsonld = enum_set - jsonld_terms
        missing_in_defs = jsonld_terms - enum_set
        if missing_in_jsonld:
            local_errors.append(f"[{def_key}] enum_lists missing terms: {sorted(missing_in_jsonld)}")
        if missing_in_defs:
            local_errors.append(f"[{def_key}] $defs missing terms present in enum_lists: {sorted(missing_in_defs)}")

    # 3) Check that all iriMap values use the expected base and filename
    for term, iri in iri_map.items():
        try:
            fname = iri_filename(iri)
        except ValueError as e:
            local_errors.append(f"[{def_key}] {e}")
            continue
        p = urlparse(iri)
        if not (p.scheme in {"http", "https"} and p.netloc):
            local_errors.append(f"[{def_key}] IRI not http(s): {iri}")
        expected_prefix = EXPECTED_BASE + fname + "#"
        if not iri.startswith(expected_prefix):
            local_errors.append(
                f"[{def_key}] Unexpected IRI base or filename for term '{term}':\n"
                f"  got:      {iri}\n  expected prefix: {expected_prefix}…"
            )
        # Also assert that the fragment matches the term name
        if "#" in iri:
            frag = unquote(iri.rsplit("#", 1)[-1])
            frag_norm = ALIAS_FRAGMENTS.get(frag, frag)
            term_norm = ALIAS_FRAGMENTS.get(term, term)
            if frag_norm != term_norm:
                local_errors.append(f"[{def_key}] IRI fragment '{frag}' does not match enum term '{term}'.")

    return local_errors


def main():
    if not os.path.isfile(PROFILE_PATH):
        print(f"ERROR: profile not found at {PROFILE_PATH}")
        sys.exit(1)
    if not os.path.isdir(ENUM_DIR):
        print(f"ERROR: enum_lists dir not found at {ENUM_DIR}")
        sys.exit(1)

    profile = load_json(PROFILE_PATH)
    defs = profile.get("$defs", {})

    for key, obj in defs.items():
        errs = check_defs_enum(key, obj)
        errors.extend(errs)

    if errors:
        print("Sync check FAILED:\n")
        for e in errors:
            print(" - ", e)
        sys.exit(1)
    else:
        print("Sync check passed: $defs enums and enum_lists are consistent.")
        sys.exit(0)


if __name__ == "__main__":
    main()