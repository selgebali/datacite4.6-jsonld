const path = require("path");
const { ensureContextEntries, ensureJsonFileMatchesOrCreate } = require("../apply-utils");

module.exports = {
  moduleId: "simple-property",
  supportedKinds: ["simple-property-added"],
  canApply(change) {
    return Boolean(change.inputs && change.inputs.propertyFile);
  },
  validate(change) {
    if (!change.inputs || !change.inputs.propertyFile || !change.inputs.propertyFile["rdfs:label"]) {
      throw new Error(`Invalid simple-property change: ${change.id}`);
    }
  },
  apply(change, context) {
    const propertyName = change.inputs.propertyFile["rdfs:label"];
    const propertyPath = path.join(context.repoRoot, "property", `${propertyName}.jsonld`);
    ensureJsonFileMatchesOrCreate(propertyPath, change.inputs.propertyFile, context.changedFiles, `Property ${propertyName}`);
    ensureContextEntries(context.repoRoot, change.inputs.contextEntries, context.changedFiles);
    context.releaseMatrixChanges.push(...(change.inputs.releaseMatrixChanges || []));
    context.appliedChangeIds.push(change.id);
  },
};
