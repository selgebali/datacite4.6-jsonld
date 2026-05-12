#!/usr/bin/env node

/*
 * Builds integrated distribution artifacts under rdf-vocabulary-staging/dist/
 * from the current manifest.
 *
 * Usage:
 *   node rdf-build-scripts/build-distribution.js [--version <x.y>]
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveManifestPath, resolveVocabRoot } = require("./lib/versioning");

const projectRoot = process.cwd();
const vocabRoot = resolveVocabRoot(projectRoot);
const licenseUrl = "https://www.apache.org/licenses/LICENSE-2.0";

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

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function urlToRel(namespace, url) {
  if (!url.startsWith(namespace)) {
    die(`URL is outside the manifest namespace: ${url}`);
  }
  return url.slice(namespace.length).split("/").join(path.sep);
}

function normalizeNode(node, sourceUrl) {
  const clone = JSON.parse(JSON.stringify(node));

  delete clone["@context"];

  if (clone["@id"]) {
    clone.id = clone["@id"];
    delete clone["@id"];
  }

  if (clone["@type"]) {
    clone.type = clone["@type"];
    delete clone["@type"];
  }

  if (clone["rdfs:label"]) {
    clone.label = clone["rdfs:label"];
    delete clone["rdfs:label"];
  }

  if (clone["rdfs:comment"]) {
    clone.comment = clone["rdfs:comment"];
    delete clone["rdfs:comment"];
  }

  const seeAlso = [];
  if (Array.isArray(clone.seeAlso)) seeAlso.push(...clone.seeAlso);
  else if (clone.seeAlso) seeAlso.push(clone.seeAlso);
  seeAlso.push(sourceUrl);
  clone.seeAlso = Array.from(new Set(seeAlso));

  return clone;
}

function loadNodesFromUrl(namespace, url) {
  const rel = urlToRel(namespace, url);
  const abs = path.join(vocabRoot, rel);

  if (!fs.existsSync(abs)) {
    die(`Manifest references a missing file: ${rel}`);
  }

  const json = readJson(abs);
  const nodes = Array.isArray(json["@graph"]) ? json["@graph"] : [json];
  return nodes.map((node) => normalizeNode(node, url));
}

function buildResourceUrlList(manifest) {
  const urls = [...manifest.classes, ...manifest.properties];

  for (const vocab of manifest.vocabularies || []) {
    urls.push(vocab.scheme);
    urls.push(...(vocab.terms || []));
  }

  return urls;
}

function buildContext() {
  return {
    id: "@id",
    type: "@type",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    owl: "http://www.w3.org/2002/07/owl#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    dcterms: "http://purl.org/dc/terms/",
    xsd: "http://www.w3.org/2001/XMLSchema#",

    label: { "@id": "rdfs:label", "@language": "en" },
    comment: { "@id": "rdfs:comment", "@language": "en" },

    Concept: "skos:Concept",
    ConceptScheme: "skos:ConceptScheme",

    prefLabel: { "@id": "skos:prefLabel", "@language": "en" },
    altLabel: { "@id": "skos:altLabel", "@language": "en" },
    definition: { "@id": "skos:definition", "@language": "en" },
    scopeNote: { "@id": "skos:scopeNote", "@language": "en" },

    notation: "skos:notation",
    inScheme: { "@id": "skos:inScheme", "@type": "@id" },
    topConceptOf: { "@id": "skos:topConceptOf", "@type": "@id" },
    hasTopConcept: {
      "@id": "skos:hasTopConcept",
      "@type": "@id",
      "@container": "@set",
    },

    title: { "@id": "dcterms:title", "@language": "en" },
    identifier: "dcterms:identifier",
    created: { "@id": "dcterms:created", "@type": "xsd:date" },
    modified: { "@id": "dcterms:modified", "@type": "xsd:date" },
    license: { "@id": "dcterms:license", "@type": "@id" },
    source: { "@id": "dcterms:source", "@type": "@id" },
    seeAlso: {
      "@id": "rdfs:seeAlso",
      "@type": "@id",
      "@container": "@set",
    },
    versionInfo: "owl:versionInfo",

    example: { "@id": "skos:example", "@container": "@set" },
    closeMatch: {
      "@id": "skos:closeMatch",
      "@type": "@id",
      "@container": "@set",
    },
  };
}

function buildOntologyNode(manifest) {
  const version = manifest.version;
  const created = manifest.releaseDate || manifest.created || new Date().toISOString().slice(0, 10);
  const distBase = `${manifest.namespace}dist/datacite-${version}`;

  return {
    id: distBase,
    type: "owl:Ontology",
    title: `DataCite Linked Data ${version} Distribution`,
    identifier: `datacite-${version}`,
    versionInfo: version,
    created,
    license: licenseUrl,
    source: `${manifest.namespace}manifest/datacite-${version}.json`,
    seeAlso: [`${distBase}.jsonld`, `${distBase}.ttl`, `${distBase}.rdf`],
    comment:
      `Integrated distribution of the DataCite linked-data classes, properties, ` +
      `vocabulary schemes, and vocabulary terms for schema version ${version}.`,
  };
}

function buildDistribution(manifest) {
  const graph = [buildOntologyNode(manifest)];
  const seen = new Set([graph[0].id]);

  for (const url of buildResourceUrlList(manifest)) {
    for (const node of loadNodesFromUrl(manifest.namespace, url)) {
      const id = node.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      graph.push(node);
    }
  }

  return {
    "@context": buildContext(),
    "@graph": graph,
  };
}

function writeRdfFormat(inputFile, outputFile, format) {
  const result = spawnSync(
    "riot",
    ["--syntax=jsonld", `--formatted=${format}`, inputFile],
    { cwd: vocabRoot, encoding: "utf8" },
  );

  if (result.error) {
    console.warn(`Skipped ${path.basename(outputFile)}: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    die(
      [
        `Failed to write ${path.basename(outputFile)} with riot.`,
        result.stderr && result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  writeText(outputFile, result.stdout);
  return true;
}

function main() {
  const argv = process.argv.slice(2);
  const wantsHelp = argv.includes("-h") || argv.includes("--help");

  if (wantsHelp) {
    console.log(
      [
        "Usage: node rdf-build-scripts/build-distribution.js [--version <x.y>] [--manifest <path>]",
        "",
        "  --version <x.y>     Read rdf-vocabulary-staging/manifest/datacite-<x.y>.json",
        "  --manifest <path>   Read an explicit manifest file path",
      ].join("\n"),
    );
    process.exit(0);
  }

  // resolveManifestPath reads manifest/ under vocabRoot
  const manifestPath = resolveManifestPath(vocabRoot, argv);

  if (!fs.existsSync(manifestPath)) {
    die(`Manifest file not found: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const version = manifest.version;
  const distDir = path.join(vocabRoot, "dist");
  const jsonldPath = path.join(distDir, `datacite-${version}.jsonld`);
  const ttlPath = path.join(distDir, `datacite-${version}.ttl`);
  const rdfPath = path.join(distDir, `datacite-${version}.rdf`);

  const distribution = buildDistribution(manifest);
  writeJson(jsonldPath, distribution);
  console.log(`Wrote ${path.relative(projectRoot, jsonldPath)}`);
  console.log(`${distribution["@graph"].length} graph nodes`);

  const wroteTtl = writeRdfFormat(jsonldPath, ttlPath, "ttl");
  if (wroteTtl) console.log(`Wrote ${path.relative(projectRoot, ttlPath)}`);

  const wroteRdf = writeRdfFormat(jsonldPath, rdfPath, "rdfxml");
  if (wroteRdf) console.log(`Wrote ${path.relative(projectRoot, rdfPath)}`);

  if (!wroteTtl || !wroteRdf) {
    die(
      "Distribution build incomplete: one or more RDF serializations failed. " +
        "Ensure the 'riot' tool is installed and on PATH.",
    );
  }
}

main();
