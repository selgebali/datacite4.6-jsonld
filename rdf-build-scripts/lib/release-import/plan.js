const path = require("path");
const { writeJson, writeText, unique } = require("./shared");

const planSchemaVersion = 1;

function createPlan(metadata, changes) {
  return {
    schemaVersion: planSchemaVersion,
    generatedAt: new Date().toISOString(),
    localLatestVersion: metadata.localLatestVersion || null,
    officialLatestVersion: metadata.officialLatestVersion || null,
    targetVersion: metadata.targetVersion,
    releaseDate: metadata.releaseDate,
    sources: unique(metadata.sources || []),
    notes: metadata.notes || [],
    changes,
  };
}

function summarizeStatuses(changes) {
  return changes.reduce((acc, change) => {
    acc[change.status] = (acc[change.status] || 0) + 1;
    return acc;
  }, {});
}

function planToMarkdown(plan, extra = {}) {
  const lines = [
    `# DataCite Release Import Plan: ${plan.targetVersion}`,
    "",
    "## Summary",
    `- Local latest version: ${plan.localLatestVersion || "none"}`,
    `- Official latest version: ${plan.officialLatestVersion || "unknown"}`,
    `- Target version: ${plan.targetVersion}`,
    `- Release date: ${plan.releaseDate}`,
  ];

  if (extra.noNewerRelease) {
    lines.push("- Detection result: no newer official release was found.");
  } else {
    lines.push(`- Detection result: ${plan.changes.length} change item(s) detected.`);
  }

  const statusSummary = summarizeStatuses(plan.changes);
  lines.push(
    `- Status summary: proposed ${statusSummary.proposed || 0}, apply ${statusSummary.apply || 0}, skip ${statusSummary.skip || 0}, manual ${statusSummary.manual || 0}`,
  );

  if (extra.missingLocalVersions && extra.missingLocalVersions.length) {
    lines.push(`- Official 4.x versions missing locally: ${extra.missingLocalVersions.join(", ")}`);
  }

  if (plan.notes && plan.notes.length) {
    lines.push("", "## Notes");
    for (const note of plan.notes) {
      lines.push(`- ${note}`);
    }
  }

  lines.push("", "## Change Items");
  if (!plan.changes.length) {
    lines.push("- None.");
  } else {
    for (const change of plan.changes) {
      lines.push(`### ${change.id}`);
      lines.push(`- Summary: ${change.summary}`);
      lines.push(`- Module: ${change.module}`);
      lines.push(`- Kind: ${change.kind}`);
      lines.push(`- Status: ${change.status}`);
      lines.push(`- Confidence: ${change.confidence}`);
      if (change.section) {
        lines.push(`- Section: ${change.section}`);
      }
      if (change.targets && change.targets.length) {
        lines.push(`- Targets: ${change.targets.join(", ")}`);
      }
      if (change.notes && change.notes.length) {
        for (const note of change.notes) {
          lines.push(`- Note: ${note}`);
        }
      }
    }
  }

  lines.push("", "## Sources");
  for (const source of plan.sources) {
    lines.push(`- ${source}`);
  }

  return `${lines.join("\n")}\n`;
}

function writePlanArtifacts(repoRoot, version, plan, markdown) {
  const reportDir = path.join(repoRoot, "reports");
  const planPath = path.join(reportDir, `release-import-plan-${version}.json`);
  const reportPath = path.join(reportDir, `release-import-plan-${version}.md`);

  writeJson(planPath, plan);
  writeText(reportPath, markdown);

  return {
    planPath,
    reportPath,
  };
}

module.exports = {
  createPlan,
  planSchemaVersion,
  planToMarkdown,
  writePlanArtifacts,
};
