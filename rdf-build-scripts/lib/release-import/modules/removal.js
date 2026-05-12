const { controlledListDescriptorMap } = require("../descriptors");
const { removeContextEntries, updateSchemeFileForRemoval } = require("../apply-utils");

module.exports = {
  moduleId: "removal",
  supportedKinds: ["controlled-list-values-removed", "xsd-element-removed", "xsd-attribute-removed"],
  canApply(change) {
    if (change.kind === "controlled-list-values-removed") {
      return Boolean(
        change.inputs &&
        change.inputs.descriptorId &&
        Array.isArray(change.inputs.removedValues) &&
        change.inputs.dropRemovedFromScheme === true &&
        change.inputs.preserveHistoricalFile === true,
      );
    }

    return Boolean(
      change.inputs &&
      typeof change.inputs.dropFromCurrentContext === "boolean" &&
      (
        change.inputs.dropFromCurrentContext === false ||
        Array.isArray(change.inputs.contextKeys)
      ),
    );
  },
  validate(change) {
    if (change.kind === "controlled-list-values-removed") {
      if (!change.inputs.preserveHistoricalFile || !change.inputs.dropRemovedFromScheme) {
        throw new Error(
          `Removal change ${change.id} must explicitly set preserveHistoricalFile=true and dropRemovedFromScheme=true before applying.`,
        );
      }
      return;
    }

    if (change.inputs.dropFromCurrentContext && !Array.isArray(change.inputs.contextKeys)) {
      throw new Error(`Removal change ${change.id} must provide contextKeys when dropFromCurrentContext=true.`);
    }
  },
  apply(change, context) {
    if (change.kind === "controlled-list-values-removed") {
      const descriptor = controlledListDescriptorMap.get(change.inputs.descriptorId);
      if (!descriptor) {
        throw new Error(`Unknown controlled-list descriptor ${change.inputs.descriptorId}`);
      }

      updateSchemeFileForRemoval(
        context.repoRoot,
        context.namespace,
        descriptor.vocabName,
        change.inputs.removedValues,
        context.changedFiles,
      );
    }

    if (change.inputs && change.inputs.dropFromCurrentContext) {
      removeContextEntries(context.repoRoot, change.inputs.contextKeys, context.changedFiles);
    }

    context.releaseMatrixChanges.push(...(change.inputs.releaseMatrixChanges || []));
    context.appliedChangeIds.push(change.id);
  },
};
