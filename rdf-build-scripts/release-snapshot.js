#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { compareVersions, getArgValue, listManifestVersions, resolveVocabRoot } = require("./lib/versioning");

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

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function runNodeScript(scriptRelPath, args) {
  const scriptAbsPath = path.join(projectRoot, scriptRelPath);
  const result = spawnSync(process.execPath, [scriptAbsPath, ...args], {
    cwd: projectRoot,
    stdio: ["inherit", "inherit", "pipe"],
  });

  if (result.error) {
    die(`Failed to run ${scriptRelPath}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderrOutput = result.stderr ? result.stderr.toString().trim() : "";
    const detail = stderrOutput ? `\n${stderrOutput}` : "";
    die(`${scriptRelPath} exited with status ${result.status}${detail}`);
  }
}

function ensureManifestExists(version, releaseDate, allowReleaseDateUpdate = false) {
  const targetPath = path.join(vocabRoot, "manifest", `datacite-${version}.json`);
  if (fs.existsSync(targetPath)) {
    const json = readJson(targetPath);
    if (!json.releaseDate) {
      json.releaseDate = releaseDate;
      writeJson(targetPath, json);
      console.log(`Updated releaseDate in rdf-vocabulary-staging/manifest/datacite-${version}.json`);
    } else if (allowReleaseDateUpdate && json.releaseDate !== releaseDate) {
      json.releaseDate = releaseDate;
      writeJson(targetPath, json);
      console.log(`Corrected releaseDate in rdf-vocabulary-staging/manifest/datacite-${version}.json`);
    }
    return;
  }

  // listManifestVersions reads manifest/ under vocabRoot
  const candidates = listManifestVersions(vocabRoot)
    .filter((v) => v !== version)
    .sort(compareVersions);
  const baseVersion = candidates.length ? candidates[candidates.length - 1] : null;

  if (!baseVersion) {
    die(`Cannot create manifest/datacite-${version}.json: no existing versioned manifest found.`);
  }

  const basePath = path.join(vocabRoot, "manifest", `datacite-${baseVersion}.json`);
  const baseManifest = readJson(basePath);
  const nextManifest = {
    ...baseManifest,
    version,
    releaseDate,
  };

  writeJson(targetPath, nextManifest);
  console.log(`Created rdf-vocabulary-staging/manifest/datacite-${version}.json from datacite-${baseVersion}.json`);
}

function main() {
  const argv = process.argv.slice(2);
  const wantsHelp = argv.includes("-h") || argv.includes("--help");
  const version = getArgValue(argv, "--version");
  const requestedReleaseDate = getArgValue(argv, "--release-date");
  const releaseDate = requestedReleaseDate || new Date().toISOString().slice(0, 10);
  const shouldSetCurrent = !argv.includes("--no-set-current");

  if (wantsHelp) {
    console.log(
      [
        "Usage: node rdf-build-scripts/release-snapshot.js --version <x.y> [--release-date YYYY-MM-DD] [--no-set-current]",
        "",
        "  --version <x.y>             Target DataCite schema version for manifest/dist outputs",
        "  --release-date YYYY-MM-DD   Stable release date for manifest/dist metadata (default: today)",
        "  --no-set-current            Build artifacts without updating datacite-current pointers",
      ].join("\n"),
    );
    process.exit(0);
  }

  if (!version) {
    die("Missing required argument: --version <x.y>");
  }

  ensureManifestExists(version, releaseDate, Boolean(requestedReleaseDate));

  runNodeScript("rdf-build-scripts/manifest-sync.js", ["--write", "--validate", "--version", version]);
  runNodeScript("rdf-build-scripts/build-distribution.js", ["--version", version]);

  if (shouldSetCurrent) {
    runNodeScript("rdf-build-scripts/update-current-pointers.js", ["--version", version]);
  }

  runNodeScript("rdf-build-scripts/generate-index-pages.js", []);
  runNodeScript("rdf-build-scripts/update-root-index.js", []);
}

main();
