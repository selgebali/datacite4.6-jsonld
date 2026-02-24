#!/usr/bin/env node

/*
 * Rebuilds and validates manifest/datacite-4.6.json from the repository file layout.
 *
 * Usage:
 *   node scripts/manifest-sync.js --check
 *   node scripts/manifest-sync.js --write
 *   node scripts/manifest-sync.js --validate
 *
 * Flags can be combined:
 *   node scripts/manifest-sync.js --write --validate
 */

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, "manifest", "datacite-4.6.json");

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

function listVocabDirs(vocabRoot) {
  if (!fs.existsSync(vocabRoot)) return [];
  return fs
    .readdirSync(vocabRoot, { withFileTypes: true })
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
  const classDir = path.join(repoRoot, "class");
  const propertyDir = path.join(repoRoot, "property");
  const contextDir = path.join(repoRoot, "context");
  const vocabRoot = path.join(repoRoot, "vocab");

  const classes = listJsonldFiles(classDir).map((f) =>
    relToUrl(namespace, path.join("class", f)),
  );

  const properties = listJsonldFiles(propertyDir).map((f) =>
    relToUrl(namespace, path.join("property", f)),
  );

  const contextFiles = [];
  for (const f of listJsonldFiles(contextDir)) {
    contextFiles.push(path.join("context", f));
  }
  const vocabTopContext = path.join("vocab", "context.jsonld");
  if (isFile(path.join(repoRoot, vocabTopContext))) {
    contextFiles.push(vocabTopContext);
  }
  for (const dir of listVocabDirs(vocabRoot)) {
    const vocabContext = path.join("vocab", dir, "context.jsonld");
    if (isFile(path.join(repoRoot, vocabContext))) {
      contextFiles.push(vocabContext);
    }
  }
  const context = contextFiles
    .sort((a, b) => a.localeCompare(b))
    .map((rel) => relToUrl(namespace, rel));

  const vocabularies = [];
  for (const dir of listVocabDirs(vocabRoot)) {
    const schemeFile = path.join("vocab", dir, `${dir}.jsonld`);
    const schemeAbs = path.join(repoRoot, schemeFile);
    if (!isFile(schemeAbs)) {
      continue;
    }

    const files = listJsonldFiles(path.join(vocabRoot, dir));
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
    const abs = path.join(repoRoot, rel);
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
  const c = summarizeManifest(current);
  const g = summarizeManifest(generated);
  return {
    current: c,
    generated: g,
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const wantsHelp = args.has("-h") || args.has("--help");
  const wantsWrite = args.has("--write");
  const wantsCheck = args.has("--check");
  const wantsValidate = args.has("--validate");
  const noFlags = !wantsWrite && !wantsCheck && !wantsValidate;

  if (wantsHelp) {
    console.log(
      [
        "Usage: node scripts/manifest-sync.js [--check] [--write] [--validate]",
        "",
        "  --check     Compare generated manifest to manifest/datacite-4.6.json",
        "  --write     Rewrite manifest/datacite-4.6.json from files on disk",
        "  --validate  Verify every manifest URL resolves to an existing file",
      ].join("\n"),
    );
    process.exit(0);
  }

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
      const counts = diffCounts(current, generated);
      console.error(JSON.stringify(counts, null, 2));
      if (!wantsWrite) {
        process.exitCode = 1;
      }
    }
  }

  if (wantsWrite) {
    fs.writeFileSync(manifestPath, stableStringify(generated));
    console.log(`Wrote ${path.relative(repoRoot, manifestPath)}`);
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
