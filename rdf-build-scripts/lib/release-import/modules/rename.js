const { buildConceptFile } = require("../shared");
const { canonicalConceptPath, controlledListDescriptorMap } = require("../descriptors");
const { ensureJsonFileMatchesOrCreate, updateSchemeFile, updateSchemeFileForRemoval } = require("../apply-utils");

module.exports = {
  moduleId: "rename",
  supportedKinds: ["controlled-list-rename-candidate"],
  canApply(change) {
    return Boolean(
      change.inputs &&
      change.inputs.descriptorId &&
      change.inputs.renameTo &&
      change.inputs.replacement &&
      change.inputs.newTermDetails &&
      Array.isArray(change.inputs.orderedTerms) &&
      typeof change.inputs.preserveHistoricalFile === "boolean",
    );
  },
  validate(change) {
    if (
      !change.inputs.renameTo ||
      !change.inputs.replacement ||
      !change.inputs.descriptorId ||
      !change.inputs.newTermDetails ||
      !Array.isArray(change.inputs.orderedTerms) ||
      typeof change.inputs.preserveHistoricalFile !== "boolean"
    ) {
      throw new Error(
        `Rename change ${change.id} must include descriptorId, replacement, renameTo, orderedTerms, newTermDetails, and preserveHistoricalFile.`,
      );
    }
  },
  apply(change, context) {
    const descriptor = controlledListDescriptorMap.get(change.inputs.descriptorId);
    if (!descriptor) {
      throw new Error(`Unknown controlled-list descriptor ${change.inputs.descriptorId}`);
    }

    const newTermPath = canonicalConceptPath(context.repoRoot, descriptor.vocabName, change.inputs.renameTo);
    ensureJsonFileMatchesOrCreate(
      newTermPath,
      buildConceptFile(context.namespace, descriptor.vocabName, change.inputs.renameTo, {
        prefLabel: change.inputs.renameTo,
        ...change.inputs.newTermDetails,
      }),
      context.changedFiles,
      `Renamed controlled-list term ${change.inputs.renameTo}`,
    );

    updateSchemeFile(
      context.repoRoot,
      context.namespace,
      descriptor.vocabName,
      change.inputs.orderedTerms,
      [change.inputs.renameTo],
      context.changedFiles,
    );

    if (change.inputs.dropReplacedFromScheme) {
      updateSchemeFileForRemoval(
        context.repoRoot,
        context.namespace,
        descriptor.vocabName,
        [change.inputs.replacement],
        context.changedFiles,
      );
    }

    context.releaseMatrixChanges.push(...(change.inputs.releaseMatrixChanges || []));
    context.appliedChangeIds.push(change.id);
  },
};
