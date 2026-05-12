const { buildConceptFile } = require("../shared");
const { controlledListDescriptorMap } = require("../descriptors");
const { canonicalConceptPath } = require("../descriptors");
const { ensureJsonFileMatchesOrCreate, updateSchemeFile } = require("../apply-utils");

module.exports = {
  moduleId: "controlled-list",
  supportedKinds: ["controlled-list-values-added"],
  canApply(change) {
    return Boolean(controlledListDescriptorMap.get(change.inputs.descriptorId));
  },
  validate(change) {
    if (!change.inputs || !change.inputs.descriptorId || !Array.isArray(change.inputs.terms)) {
      throw new Error(`Invalid controlled-list change: ${change.id}`);
    }
  },
  apply(change, context) {
    const descriptor = controlledListDescriptorMap.get(change.inputs.descriptorId);
    if (!descriptor) {
      throw new Error(`Unknown controlled-list descriptor ${change.inputs.descriptorId}`);
    }

    for (const term of change.inputs.terms) {
      const filePath = canonicalConceptPath(context.repoRoot, descriptor.vocabName, term.name);
      ensureJsonFileMatchesOrCreate(
        filePath,
        buildConceptFile(context.namespace, descriptor.vocabName, term.name, term.details),
        context.changedFiles,
        `Controlled-list term ${term.name}`,
      );
    }

    updateSchemeFile(
      context.repoRoot,
      context.namespace,
      descriptor.vocabName,
      change.inputs.orderedTerms,
      change.inputs.terms.map((term) => term.name),
      context.changedFiles,
    );

    context.releaseMatrixChanges.push(...(change.inputs.releaseMatrixChanges || []));
    context.appliedChangeIds.push(change.id);
  },
};
