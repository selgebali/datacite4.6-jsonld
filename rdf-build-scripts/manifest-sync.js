#!/usr/bin/env node

/*
 * Rebuilds and validates the selected manifest from the repository file layout
 * under rdf-vocabulary-staging/.
 *
 * Usage:
 *   node rdf-build-scripts/manifest-sync.js --check
 *   node rdf-build-scripts/manifest-sync.js --write
 *   node rdf-build-scripts/manifest-sync.js --validate
 *
 * Flags can be combined:
 *   node rdf-build-scripts/manifest-sync.js --write --validate
 */

const fs = require("fs");
const path = require("path");
const {
  compareVersions,
  resolveManifestPath,
  resolveVocabRoot,
} = require("./lib/versioning");

const projectRoot = process.cwd();
const vocabRoot = resolveVocabRoot(projectRoot);

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    die(`Failed to read JSON: ${file}\n${err.message}`);
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function listJsonldFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".jsonld"))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function listVocabDirs(vocabDir) {
  if (!fs.existsSync(vocabDir)) return [];
  return fs
    .readdirSync(vocabDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function relToUrl(namespace, relPath) {
  return namespace + relPath.split(path.sep).join("/");
}

function urlToRel(namespace, url) {
  if (!url.startsWith(namespace)) return null;
  return url.slice(namespace.length);
}

/**
 * Subtract URLs that were added in a release newer than the target version.
 *
 * Each `release-matrix-<from>-<to>.json` declares the additive diff between
 * two adjacent releases. When generating a *historical* manifest (e.g.
 * datacite-4.6.json), the on-disk source files reflect the *latest* state,
 * so the naive generator would include 4.7-and-later additions (Poster,
 * Presentation, RAiD, SWHID, relationType/Other, sub-property
 * relationTypeInformation, ...) that did not exist at 4.6 release time.
 *
 * For each release matrix where the `toVersion` is strictly newer than the
 * target version we're building, we strip out:
 *   - `controlled-term-added` entries (term URLs inside the named scheme)
 *   - `sub-property-added` entries (property URLs)
 *
 * Returns a manifest object with the same shape, narrowed appropriately.
 *
 * Note: the monotonic-shrink guard runs *after* this subtraction, so growth
 * relative to the existing on-disk manifest is what gets checked — which is
 * the right thing for backfills (newly added schemes), and the right thing
 * for accidental shrinks (caught and rejected).
 */
function applyReleaseMatrixSubtractions(manifest, targetVersion, manifestDir) {
  if (!targetVersion) return manifest;
  if (!fs.existsSync(manifestDir)) return manifest;

  const matrixFiles = fs
    .readdirSync(manifestDir)
    .filter((f) => /^release-matrix-.+\.json$/i.test(f));

  if (matrixFiles.length === 0) return manifest;

  const namespace = manifest.namespace;
  const droppedTerms = new Set();
  const droppedProperties = new Set();

  for (const filename of matrixFiles) {
    const matrix = readJson(path.join(manifestDir, filename));
    if (!matrix || !matrix.toVersion) continue;
    if (compareVersions(matrix.toVersion, targetVersion) <= 0) continue;

    for (const change of matrix.changes || []) {
      if (change.kind === "controlled-term-added") {
        for (const term of change.values || []) {
          const url = `${namespace}vocab/${change.target}/${term}.jsonld`;
          droppedTerms.add(url);
        }
      } else if (change.kind === "sub-property-added") {
        const url = `${namespace}property/${change.property}.jsonld`;
        droppedProperties.add(url);
      }
    }
  }

  if (droppedTerms.size === 0 && droppedProperties.size === 0) return manifest;

  const narrowedVocabularies = manifest.vocabularies.map((vocab) => ({
    ...vocab,
    terms: vocab.terms.filter((t) => !droppedTerms.has(t)),
  }));
  const narrowedProperties = manifest.properties.filter(
    (p) => !droppedProperties.has(p),
  );

  return {
    ...manifest,
    vocabularies: narrowedVocabularies,
    properties: narrowedProperties,
  };
}

function buildManifest(existingManifest) {
  const namespace = existingManifest.namespace;
  const version = existingManifest.version;
  const classDir = path.join(vocabRoot, "class");
  const propertyDir = path.join(vocabRoot, "property");
  const contextDir = path.join(vocabRoot, "context");
  const vocabDir = path.join(vocabRoot, "vocab");

  const classes = listJsonldFiles(classDir).map((f) =>
    relToUrl(namespace, path.join("class", f)),
  );

  const properties = listJsonldFiles(propertyDir).map((f) =>
    relToUrl(namespace, path.join("property", f)),
  );

  const contextFiles = [];
  for (const f of listJsonldFiles(contextDir)) {
    if (f === "runner.jsonld") continue;
    contextFiles.push(path.join("context", f));
  }
  const vocabTopContext = path.join("vocab", "context.jsonld");
  if (isFile(path.join(vocabRoot, vocabTopContext))) {
    contextFiles.push(vocabTopContext);
  }
  for (const dir of listVocabDirs(vocabDir)) {
    const vocabContext = path.join("vocab", dir, "context.jsonld");
    if (isFile(path.join(vocabRoot, vocabContext))) {
      contextFiles.push(vocabContext);
    }
  }
  const context = contextFiles
    .sort((a, b) => a.localeCompare(b))
    .map((rel) => relToUrl(namespace, rel));

  const vocabularies = [];
  for (const dir of listVocabDirs(vocabDir)) {
    const schemeFile = path.join("vocab", dir, `${dir}.jsonld`);
    const schemeAbs = path.join(vocabRoot, schemeFile);
    if (!isFile(schemeAbs)) {
      continue;
    }

    const files = listJsonldFiles(path.join(vocabDir, dir));
    const terms = files
      .filter((f) => f !== "context.jsonld" && f !== `${dir}.jsonld`)
      .map((f) => relToUrl(namespace, path.join("vocab", dir, f)));

    vocabularies.push({
      scheme: relToUrl(namespace, schemeFile),
      terms,
    });
  }

  vocabularies.sort((a, b) => a.scheme.localeCompare(b.scheme));

  return {
    ...existingManifest,
    namespace,
    version,
    context,
    classes,
    properties,
    vocabularies,
  };
}

function stableStringify(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

function summarizeManifest(m) {
  return {
    classes: m.classes.length,
    properties: m.properties.length,
    context: (m.context || []).length,
    vocabularies: m.vocabularies.length,
    vocabTerms: m.vocabularies.reduce((n, v) => n + v.terms.length, 0),
    totalUrls:
      m.classes.length +
      m.properties.length +
      (m.context || []).length +
      m.vocabularies.reduce((n, v) => n + 1 + v.terms.length, 0),
  };
}

function validateManifestLinks(m) {
  const namespace = m.namespace;
  const seen = new Set();
  const issues = [];

  function checkUrl(kind, url) {
    if (seen.has(`${kind}|${url}`)) return;
    seen.add(`${kind}|${url}`);

    if (!url.startsWith(namespace)) {
      issues.push({ kind, url, reason: "URL does not start with manifest namespace" });
      return;
    }
    const rel = urlToRel(namespace, url);
    const abs = path.join(vocabRoot, rel);
    if (!isFile(abs)) {
      issues.push({ kind, url, rel, reason: "Referenced file does not exist" });
    }
  }

  for (const url of m.classes) checkUrl("class", url);
  for (const url of m.properties) checkUrl("property", url);
  for (const url of m.context || []) checkUrl("context", url);
  for (const vocab of m.vocabularies) {
    checkUrl("vocab-scheme", vocab.scheme);
    for (const term of vocab.terms) checkUrl("vocab-term", term);
  }

  return issues;
}

function diffCounts(current, generated) {
  return {
    current: summarizeManifest(current),
    generated: summarizeManifest(generated),
  };
}

function collectAllUrls(manifest) {
  const urls = [];
  for (const u of manifest.classes || []) urls.push(u);
  for (const u of manifest.properties || []) urls.push(u);
  for (const u of manifest.context || []) urls.push(u);
  for (const v of manifest.vocabularies || []) {
    urls.push(v.scheme);
    for (const t of v.terms || []) urls.push(t);
  }
  return urls;
}

/**
 * Detect URLs present in the existing manifest that are missing from the
 * generated one. Returned as a sorted, de-duplicated array.
 *
 * Historical manifests (datacite-4.6, datacite-4.5, ...) are an immutable
 * record of what a released DataCite version declared. Once a URL appears
 * in a release manifest, the namespace MUST keep serving it. Therefore
 * any --write that would shrink a manifest is treated as a bug unless the
 * caller explicitly passes --allow-narrow (e.g. a controlled-term
 * deprecation that is consciously being recorded).
 */
function findLostUrls(existing, generated) {
  const existingUrls = new Set(collectAllUrls(existing));
  const generatedUrls = new Set(collectAllUrls(generated));
  const lost = [];
  for (const u of existingUrls) {
    if (!generatedUrls.has(u)) lost.push(u);
  }
  return lost.sort((a, b) => a.localeCompare(b));
}

function formatLostUrlError(lost, manifestPath) {
  const preview = lost.slice(0, 20).map((u) => "  - " + u);
  const tail = lost.length > 20 ? [`  ... and ${lost.length - 20} more`] : [];
  return [
    `Refusing to narrow manifest ${path.relative(projectRoot, manifestPath)}:`,
    `${lost.length} URL(s) present in the existing manifest are missing from`,
    `the generated one. A frozen release manifest must remain monotonic.`,
    ``,
    `Lost URLs:`,
    ...preview,
    ...tail,
    ``,
    `Common causes:`,
    `  - A vocab folder was deleted on disk that the manifest still references`,
    `    (restore the folder, or add --allow-narrow if the deletion is`,
    `    intentional and the deprecation is recorded in release notes).`,
    `  - You are running --write on a historical manifest from a worktree`,
    `    that doesn't yet hold every vocab the historical release shipped`,
    `    (backfill the missing vocab folders before re-running).`,
    ``,
    `If the shrinkage is intentional, re-run with --allow-narrow.`,
  ].join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const wantsHelp = args.has("-h") || args.has("--help");
  const wantsWrite = args.has("--write");
  const wantsCheck = args.has("--check");
  const wantsValidate = args.has("--validate");
  const allowNarrow = args.has("--allow-narrow");
  const noFlags = !wantsWrite && !wantsCheck && !wantsValidate;

  if (wantsHelp) {
    console.log(
      [
        "Usage: node rdf-build-scripts/manifest-sync.js [--check] [--write] [--validate] [--version <x.y>] [--manifest <path>] [--allow-narrow]",
        "",
        "  --check             Compare generated manifest to the selected manifest file",
        "  --write             Rewrite the selected manifest from files on disk",
        "  --validate          Verify every manifest URL resolves to an existing file",
        "  --version <x.y>     Select rdf-vocabulary-staging/manifest/datacite-<x.y>.json",
        "  --manifest <path>   Select an explicit manifest file path",
        "  --allow-narrow      Permit --write to remove URLs from a frozen manifest",
        "                      (default behaviour: refuse, to keep released manifests",
        "                      monotonically growing).",
        "",
        "Monotonic-manifest guard:",
        "  Both --check and --write fail if the manifest would shrink (a URL present",
        "  in the existing manifest is missing from the generated one). Pass",
        "  --allow-narrow when a controlled-term removal is intentional and recorded",
        "  in release notes.",
      ].join("\n"),
    );
    process.exit(0);
  }

  const manifestPath = resolveManifestPath(vocabRoot, argv);

  if (!isFile(manifestPath)) {
    die(`Manifest file not found: ${manifestPath}`);
  }

  const current = readJson(manifestPath);
  let generated = buildManifest(current);
  const manifestDir = path.dirname(manifestPath);
  generated = applyReleaseMatrixSubtractions(generated, current.version, manifestDir);
  const lost = findLostUrls(current, generated);

  if (noFlags || wantsCheck) {
    const same = stableStringify(current) === stableStringify(generated);
    if (same) {
      console.log("Manifest check: OK (manifest is synchronized with files on disk)");
    } else {
      console.error("Manifest check: FAILED (manifest is out of sync)");
      console.error(JSON.stringify(diffCounts(current, generated), null, 2));
      if (lost.length > 0) {
        console.error("");
        console.error(formatLostUrlError(lost, manifestPath));
      }
      if (!wantsWrite) {
        process.exitCode = lost.length > 0 ? 2 : 1;
      }
    }
  }

  if (wantsWrite) {
    if (lost.length > 0 && !allowNarrow) {
      die(formatLostUrlError(lost, manifestPath), 2);
    }
    fs.writeFileSync(manifestPath, stableStringify(generated));
    console.log(`Wrote ${path.relative(projectRoot, manifestPath)}`);
    console.log(JSON.stringify(summarizeManifest(generated), null, 2));
    if (lost.length > 0 && allowNarrow) {
      console.warn(
        `Warning: --allow-narrow accepted; ${lost.length} URL(s) removed from manifest. ` +
          `Record this deprecation in release notes.`,
      );
    }
  }

  if (wantsValidate) {
    const manifestToValidate = wantsWrite ? readJson(manifestPath) : current;
    const issues = validateManifestLinks(manifestToValidate);
    if (issues.length === 0) {
      console.log("Manifest link validation: OK (all referenced files exist)");
    } else {
      console.error(`Manifest link validation: FAILED (${issues.length} issue(s))`);
      console.error(JSON.stringify(issues.slice(0, 50), null, 2));
      process.exitCode = 1;
    }
  }
}

main();
