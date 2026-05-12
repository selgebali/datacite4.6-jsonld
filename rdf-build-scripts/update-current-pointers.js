#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { getArgValue, listManifestVersions, resolveCurrentVersion, resolveVocabRoot } = require("./lib/versioning");

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

function copyLatestDistributionAliases(version) {
  const aliases = [
    {
      source: path.join("dist", `datacite-${version}.jsonld`),
      target: path.join("dist", "datacite.jsonld"),
      required: true,
    },
    {
      source: path.join("dist", `datacite-${version}.ttl`),
      target: path.join("dist", "datacite.ttl"),
      required: false,
    },
    {
      source: path.join("dist", `datacite-${version}.rdf`),
      target: path.join("dist", "datacite.rdf"),
      required: false,
    },
  ];

  for (const alias of aliases) {
    const sourceAbs = path.join(vocabRoot, alias.source);
    const targetAbs = path.join(vocabRoot, alias.target);

    if (!fs.existsSync(sourceAbs)) {
      if (alias.required) {
        die(`Latest distribution source is missing: ${alias.source}`);
      }
      console.warn(`Skipped ${alias.target}: source file not found (${alias.source})`);
      continue;
    }

    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.copyFileSync(sourceAbs, targetAbs);
    console.log(`Wrote ${path.relative(projectRoot, targetAbs)}`);
  }
}

function buildVersionLinks(namespace, version) {
  return {
    version,
    manifest: `${namespace}manifest/datacite-${version}.json`,
    distJsonld: `${namespace}dist/datacite-${version}.jsonld`,
    distTtl: `${namespace}dist/datacite-${version}.ttl`,
    distRdf: `${namespace}dist/datacite-${version}.rdf`,
  };
}

function buildDistCurrentPointer(namespace, currentLinks) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    "@context": {
      id: "@id",
      type: "@type",
      owl: "http://www.w3.org/2002/07/owl#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      dcterms: "http://purl.org/dc/terms/",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      title: { "@id": "dcterms:title", "@language": "en" },
      identifier: "dcterms:identifier",
      modified: { "@id": "dcterms:modified", "@type": "xsd:date" },
      source: { "@id": "dcterms:source", "@type": "@id" },
      seeAlso: { "@id": "rdfs:seeAlso", "@type": "@id", "@container": "@set" },
      versionInfo: "owl:versionInfo",
      comment: { "@id": "rdfs:comment", "@language": "en" },
    },
    "@graph": [
      {
        id: `${namespace}dist/datacite-current`,
        type: "owl:Ontology",
        title: "DataCite Linked Data Current Distribution Pointer",
        identifier: "datacite-current",
        versionInfo: currentLinks.version,
        modified: today,
        source: currentLinks.manifest,
        seeAlso: [currentLinks.distJsonld, currentLinks.distTtl, currentLinks.distRdf],
        comment: "Pointer to the current default DataCite linked-data distribution.",
      },
    ],
  };
}

function main() {
  const argv = process.argv.slice(2);
  const wantsHelp = argv.includes("-h") || argv.includes("--help");
  if (wantsHelp) {
    console.log(
      [
        "Usage: node rdf-build-scripts/update-current-pointers.js [--version <x.y>]",
        "",
        "  --version <x.y>     Version to mark as current (default: datacite-current.json value or latest manifest version)",
        "",
        "Also refreshes moving rdf-vocabulary-staging/dist/datacite.{jsonld,ttl,rdf} aliases.",
      ].join("\n"),
    );
    process.exit(0);
  }

  const requestedVersion = getArgValue(argv, "--version");
  // resolveCurrentVersion reads manifest/datacite-current.json under vocabRoot
  const currentVersion = requestedVersion || resolveCurrentVersion(vocabRoot);
  const manifestPath = path.join(vocabRoot, "manifest", `datacite-${currentVersion}.json`);

  if (!fs.existsSync(manifestPath)) {
    die(`Manifest file not found for current version ${currentVersion}: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const namespace = manifest.namespace;
  const versions = listManifestVersions(vocabRoot);
  const availableVersions = versions.map((v) => buildVersionLinks(namespace, v));

  let currentLinks = availableVersions.find((v) => v.version === currentVersion);
  if (!currentLinks) {
    currentLinks = buildVersionLinks(namespace, currentVersion);
    availableVersions.push(currentLinks);
  }

  const manifestCurrent = {
    namespace,
    currentVersion,
    updated: new Date().toISOString().slice(0, 10),
    links: {
      manifest: currentLinks.manifest,
      distJsonld: currentLinks.distJsonld,
      distTtl: currentLinks.distTtl,
      distRdf: currentLinks.distRdf,
    },
    availableVersions,
  };

  const manifestCurrentPath = path.join(vocabRoot, "manifest", "datacite-current.json");
  writeJson(manifestCurrentPath, manifestCurrent);
  console.log(`Wrote ${path.relative(projectRoot, manifestCurrentPath)}`);

  const distCurrentPath = path.join(vocabRoot, "dist", "datacite-current.jsonld");
  writeJson(distCurrentPath, buildDistCurrentPointer(namespace, currentLinks));
  console.log(`Wrote ${path.relative(projectRoot, distCurrentPath)}`);

  copyLatestDistributionAliases(currentVersion);
}

main();
