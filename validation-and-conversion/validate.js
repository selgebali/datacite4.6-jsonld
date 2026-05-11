// validate.js
const fs       = require("fs");
const { validate } = require("jskos-validate");

// Read an NDJSON file (default: jskos-mappings.ndjson)
const filePath = process.argv[2] || "jskos-mappings.ndjson";
const lines    = fs.readFileSync(filePath, "utf8")
                   .trim()
                   .split(/\r?\n/)
                   .filter(Boolean);
const items    = lines.map(line => JSON.parse(line));

let countValid = 0, countInvalid = 0;

items.forEach((item, idx) => {
  const typeField = item.type || item["@type"];
  let isValid, errors;

  if (item.from && item.to) {
    isValid = validate.mapping(item);
    errors  = validate.mapping.errorMessages;
  }
  else if (typeField && typeField.includes("skos:Concept")) {
    isValid = validate.concept(item);
    errors  = validate.concept.errorMessages;
  }
  else if (typeField && typeField.includes("ConceptScheme")) {
    isValid = validate.scheme(item);
    errors  = validate.scheme.errorMessages;
  }
  else {
    console.warn(`⚠️ Skipping unknown item ${idx}`);
    return;
  }

  if (isValid) {
    console.log(`✅ [${typeField}] Item ${idx} valid.`);
    countValid++;
  } else {
    console.log(`❌ [${typeField}] Item ${idx} INVALID:`);
    errors.forEach(e => console.log("  -", e));
    countInvalid++;
  }
});

console.log(`\n✔️ Summary: ${countValid} valid, ${countInvalid} invalid.`);