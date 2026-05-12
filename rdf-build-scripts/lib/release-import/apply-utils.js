const path = require("path");
const {
  readJson,
  readText,
  stableStringify,
  writeJson,
  writeText,
} = require("./shared");

function writeJsonIfChanged(filePath, value, changedFiles) {
  const next = stableStringify(value);
  const previous = require("fs").existsSync(filePath) ? readText(filePath) : null;
  if (previous === next) {
    return false;
  }

  writeJson(filePath, value);
  changedFiles.push(filePath);
  return true;
}

function writeTextIfChanged(filePath, value, changedFiles) {
  const previous = require("fs").existsSync(filePath) ? readText(filePath) : null;
  if (previous === value) {
    return false;
  }

  writeText(filePath, value);
  changedFiles.push(filePath);
  return true;
}

function ensureJsonFileMatchesOrCreate(filePath, value, changedFiles, label) {
  const fs = require("fs");
  if (!fs.existsSync(filePath)) {
    return writeJsonIfChanged(filePath, value, changedFiles);
  }

  const existing = readJson(filePath);
  if (stableStringify(existing) !== stableStringify(value)) {
    throw new Error(`${label} already exists and differs from the approved plan: ${filePath}`);
  }

  return false;
}

function formatContextEntry(key, value) {
  return JSON.stringify({ [key]: value }, null, 4)
    .trim()
    .replace(/^\{\n/, "")
    .replace(/\n\}$/, "");
}

function ensureContextEntries(repoRoot, entries, changedFiles) {
  const contextPath = path.join(repoRoot, "context", "fullcontext.jsonld");
  const contextJson = readJson(contextPath);
  const context = contextJson["@context"] || {};
  let text = readText(contextPath);
  let mutated = false;

  for (const entry of entries || []) {
    if (typeof context[entry.key] !== "undefined") {
      if (JSON.stringify(context[entry.key]) !== JSON.stringify(entry.value)) {
        throw new Error(`Context mapping for ${entry.key} already exists with different content: ${contextPath}`);
      }
      continue;
    }

    const block = formatContextEntry(entry.key, entry.value);
    const anchor = entry.afterKey
      ? new RegExp(`("${entry.afterKey}": [\\s\\S]*?(?:\\n    \\},|\\n    "[^"]+":|\\n  \\}))`)
      : null;

    if (anchor && anchor.test(text)) {
      text = text.replace(anchor, (match) => `${match}\n${block},`);
    } else if (/^\{\n  "@context": \{\n/m.test(text)) {
      text = text.replace('{\n  "@context": {\n', `{\n  "@context": {\n${block},\n`);
    } else {
      throw new Error(`Could not determine insertion point for context key ${entry.key} in ${contextPath}`);
    }

    context[entry.key] = entry.value;
    mutated = true;
  }

  if (mutated) {
    writeTextIfChanged(contextPath, text, changedFiles);
  }
}

function removeContextEntries(repoRoot, keys, changedFiles) {
  const contextPath = path.join(repoRoot, "context", "fullcontext.jsonld");
  const contextJson = readJson(contextPath);
  const context = contextJson["@context"] || {};
  let mutated = false;

  for (const key of keys || []) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      delete context[key];
      mutated = true;
    }
  }

  if (mutated) {
    contextJson["@context"] = context;
    writeJsonIfChanged(contextPath, contextJson, changedFiles);
  }
}

function mergeAddedTerms(currentTerms, officialTerms, addedTerms) {
  const nextTerms = currentTerms.slice();

  for (const term of addedTerms) {
    if (nextTerms.includes(term)) {
      continue;
    }

    const termIndex = officialTerms.indexOf(term);
    const followingExisting = officialTerms
      .slice(termIndex + 1)
      .find((candidate) => nextTerms.includes(candidate));

    if (followingExisting) {
      nextTerms.splice(nextTerms.indexOf(followingExisting), 0, term);
    } else {
      nextTerms.push(term);
    }
  }

  return nextTerms;
}

function updateSchemeFile(repoRoot, namespace, vocabName, orderedTerms, addedTerms, changedFiles) {
  const schemePath = path.join(repoRoot, "vocab", vocabName, `${vocabName}.jsonld`);
  const scheme = readJson(schemePath);
  const graphNode = Array.isArray(scheme["@graph"]) ? scheme["@graph"][0] : null;

  if (!graphNode || !Array.isArray(graphNode.hasTopConcept)) {
    throw new Error(`Unexpected vocabulary scheme shape in ${schemePath}`);
  }

  const currentTerms = graphNode.hasTopConcept.map((url) => url.split("/").pop());
  const mergedTerms = mergeAddedTerms(currentTerms, orderedTerms, addedTerms);
  if (mergedTerms.join("\n") === currentTerms.join("\n")) {
    return false;
  }

  graphNode.hasTopConcept = mergedTerms.map((term) => `${namespace}vocab/${vocabName}/${term}`);
  return writeJsonIfChanged(schemePath, scheme, changedFiles);
}

function updateSchemeFileForRemoval(repoRoot, namespace, vocabName, removedTerms, changedFiles) {
  const schemePath = path.join(repoRoot, "vocab", vocabName, `${vocabName}.jsonld`);
  const scheme = readJson(schemePath);
  const graphNode = Array.isArray(scheme["@graph"]) ? scheme["@graph"][0] : null;

  if (!graphNode || !Array.isArray(graphNode.hasTopConcept)) {
    throw new Error(`Unexpected vocabulary scheme shape in ${schemePath}`);
  }

  const nextTerms = graphNode.hasTopConcept
    .map((url) => url.split("/").pop())
    .filter((term) => !removedTerms.includes(term));

  graphNode.hasTopConcept = nextTerms.map((term) => `${namespace}vocab/${vocabName}/${term}`);
  return writeJsonIfChanged(schemePath, scheme, changedFiles);
}

function buildReleaseMatrix(previousVersion, nextVersion, releaseDate, changes, sources) {
  return {
    fromVersion: previousVersion,
    toVersion: nextVersion,
    releaseDate,
    changes,
    sources: Array.from(new Set(sources || [])).sort((a, b) => a.localeCompare(b)),
  };
}

function writeReleaseMatrix(repoRoot, previousVersion, version, releaseDate, changes, sources, changedFiles) {
  const matrixPath = path.join(repoRoot, "manifest", `release-matrix-${previousVersion}-${version}.json`);
  return writeJsonIfChanged(matrixPath, buildReleaseMatrix(previousVersion, version, releaseDate, changes, sources), changedFiles);
}

module.exports = {
  buildReleaseMatrix,
  ensureContextEntries,
  ensureJsonFileMatchesOrCreate,
  removeContextEntries,
  updateSchemeFile,
  updateSchemeFileForRemoval,
  writeJsonIfChanged,
  writeReleaseMatrix,
  writeTextIfChanged,
};
