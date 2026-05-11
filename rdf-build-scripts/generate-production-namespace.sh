#!/usr/bin/env bash
# Generates a production-namespace/ copy of rdf-vocabulary-staging/ by
# replacing schema.stage.datacite.org with schema.datacite.org in every file.
#
# Usage (from repo root):
#   bash rdf-build-scripts/generate-production-namespace.sh
#
# Output: production-namespace/  (created or overwritten in place)

set -euo pipefail

SRC="rdf-vocabulary-staging"
DST="production-namespace"
STAGING_URL="https://schema.stage.datacite.org"
PRODUCTION_URL="https://schema.datacite.org"

if [ ! -d "$SRC" ]; then
  echo "Error: $SRC not found. Run from the repo root." >&2
  exit 1
fi

rm -rf "$DST"
cp -r "$SRC" "$DST"

find "$DST" -type f | while read -r file; do
  sed -i.bak "s|$STAGING_URL|$PRODUCTION_URL|g" "$file"
  rm "${file}.bak"
done

echo "Done. Production namespace written to $DST/"
echo "Files: $(find "$DST" -type f | wc -l | tr -d ' ')"
