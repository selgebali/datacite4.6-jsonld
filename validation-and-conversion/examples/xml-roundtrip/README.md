# XML ↔ JSON ↔ XML Roundtrip — Example Files

This folder contains all artefacts from the xml-js roundtrip experiment. The experiment demonstrates that a DataCite XML file can be converted to a JSON representation and converted back to XML without any data loss, producing output that validates against the DataCite XSD.

For the commands used and the conclusions, see [`validation-and-conversion/roundtrip-experiment-notes.md`](../../validation-and-conversion/roundtrip-experiment-notes.md).

---

## Files

| File | Description |
|------|-------------|
| `datacite-example-full-v4.xml` | Input: the full DataCite 4.6 example XML |
| `XML-Shaped-JSON.json` | Step 1 output: XML converted to JSON using xml-js with `attrs`/`value` conventions |
| `roundtrip.xml` | Step 2 output: JSON converted back to XML |
| `original.c14n.xml` | Canonicalized (c14n) form of the input XML |
| `roundtrip.c14n.xml` | Canonicalized (c14n) form of the roundtrip XML |
| `diff.json` | Diff output between the two canonicalized files (0 changes) |
| `validate_xml.rb` | Ruby script used to validate `roundtrip.c14n.xml` against the DataCite XSD via bolognese |

---

## JSON structure conventions

The xml-js tool maps XML to JSON using two special keys:

- **`attrs`** — holds XML element attributes (e.g. `<element type="DOI">` → `"attrs": { "type": "DOI" }`)
- **`value`** — holds XML element text content (e.g. `<identifier>10.1234/abc</identifier>` → `"value": "10.1234/abc"`)
- **direct properties** — child XML elements become nested JSON objects

### Example

XML:
```xml
<identifier identifierType="DOI">10.82433/B09Z-4K37</identifier>
```

JSON:
```json
"identifier": {
  "attrs": { "identifierType": "DOI" },
  "value": "10.82433/B09Z-4K37"
}
```

---

## Roundtrip result

**XML → JSON → XML = valid against DataCite (kernel-4) XSD. Zero diff against original.**
