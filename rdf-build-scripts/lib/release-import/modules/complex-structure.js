const path = require("path");
const { ensureContextEntries, ensureJsonFileMatchesOrCreate } = require("../apply-utils");

module.exports = {
  moduleId: "complex-structure",
  supportedKinds: ["complex-structure-added"],
  canApply(change) {
    return Boolean(change.inputs && Array.isArray(change.inputs.classFiles) && Array.isArray(change.inputs.propertyFiles));
  },
  validate(change) {
    if (!change.inputs || !Array.isArray(change.inputs.classFiles) || !Array.isArray(change.inputs.propertyFiles)) {
      throw new Error(`Invalid complex-structure change: ${change.id}`);
    }
  },
  apply(change, context) {
    for (const classFile of change.inputs.classFiles) {
      const className = classFile.value["rdfs:label"];
      const classPath = path.join(context.repoRoot, "class", `${className}.jsonld`);
      ensureJsonFileMatchesOrCreate(classPath, classFile.value, context.changedFiles, `Class ${className}`);
    }

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
