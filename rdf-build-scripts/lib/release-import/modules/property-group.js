const path = require("path");
const { ensureContextEntries, ensureJsonFileMatchesOrCreate } = require("../apply-utils");

module.exports = {
  moduleId: "property-group",
  supportedKinds: ["property-group-added"],
  canApply(change) {
    return Boolean(change.inputs && Array.isArray(change.inputs.propertyFiles));
  },
  validate(change) {
    if (!change.inputs || !Array.isArray(change.inputs.propertyFiles)) {
      throw new Error(`Invalid property-group change: ${change.id}`);
    }
  },
  apply(change, context) {
    for (const propertyFile of change.inputs.propertyFiles) {
      const propertyName = propertyFile.value["rdfs:label"];
      const propertyPath = path.join(context.repoRoot, "property", `${propertyName}.jsonld`);
      ensureJsonFileMatchesOrCreate(propertyPath, propertyFile.value, context.changedFiles, `Property ${propertyName}`);
    }

    ensureContextEntries(context.repoRoot, change.inputs.contextEntries, context.changedFiles);
    context.releaseMatrixChanges.push(...(change.inputs.releaseMatrixChanges || []));
    context.appliedChangeIds.push(change.id);
  },
};
