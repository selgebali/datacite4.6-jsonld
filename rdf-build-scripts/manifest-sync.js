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
const { resolveManifestPath, resolveVocabRoot } = require("./lib/versioning");

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

function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const wantsHelp = args.has("-h") || args.has("--help");
  const wantsWrite = args.has("--write");
  const wantsCheck = args.has("--check");
  const wantsValidate = args.has("--validate");
  const noFlags = !wantsWrite && !wantsCheck && !wantsValidate;

  if (wantsHelp) {
    console.log(
      [
        "Usage: node rdf-build-scripts/manifest-sync.js [--check] [--write] [--validate] [--version <x.y>] [--manifest <path>]",
        "",
        "  --check             Compare generated manifest to the selected manifest file",
        "  --write             Rewrite the selected manifest from files on disk",
        "  --validate          Verify every manifest URL resolves to an existing file",
        "  --version <x.y>     Select rdf-vocabulary-staging/manifest/datacite-<x.y>.json",
        "  --manifest <path>   Select an explicit manifest file path",
        "",
        "Note: Historical frozen manifests are expected to drift from current source files.",
        "Use --validate on frozen versions, and use --check for the active version.",
      ].join("\n"),
    );
    process.exit(0);
  }

  const manifestPath = resolveManifestPath(vocabRoot, argv);

  if (!isFile(manifestPath)) {
    die(`Manifest file not found: ${manifestPath}`);
  }

  const current = readJson(manifestPath);
  const generated = buildManifest(current);

  if (noFlags || wantsCheck) {
    const same = stableStringify(current) === stableStringify(generated);
    if (same) {
      console.log("Manifest check: OK (manifest is synchronized with files on disk)");
    } else {
      console.error("Manifest check: FAILED (manifest is out of sync)");
      console.error(JSON.stringify(diffCounts(current, generated), null, 2));
      if (!wantsWrite) {
        process.exitCode = 1;
      }
    }
  }

  if (wantsWrite) {
    fs.writeFileSync(manifestPath, stableStringify(generated));
    console.log(`Wrote ${path.relative(projectRoot, manifestPath)}`);
    console.log(JSON.stringify(summarizeManifest(generated), null, 2));
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
