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

/**
 * Strip the `.jsonld` suffix and convert a manifest URL into its RDF @id form.
 *   .../vocab/X/X.jsonld -> .../vocab/X        (ConceptScheme @id)
 *   .../vocab/X/Y.jsonld -> .../vocab/X/Y      (Concept @id)
 *   .../class/Foo.jsonld -> .../class/Foo      (Class @id)
 *   .../property/foo.jsonld -> .../property/foo (Property @id)
 */
function manifestUrlToRdfId(url, kind) {
  if (kind === "vocab-scheme") {
    return url.replace(/\/[^/]+\.jsonld$/, "");
  }
  return url.replace(/\.jsonld$/, "");
}

/**
 * Filter each ConceptScheme node's `hasTopConcept` to only the term URLs the
 * manifest declares for that scheme. The source-of-truth `<scheme>.jsonld`
 * file always carries the *current* (latest-release) hasTopConcept array,
 * so when we build a historical-release dist (4.6) the scheme would
 * otherwise reference terms that are not actually part of that release
 * (e.g. Poster/Presentation/RAiD/SWHID in DataCite 4.6). The manifest is
 * the authoritative per-release truth, so we project the scheme's
 * hasTopConcept down to the manifest's view.
 */
function narrowSchemeTopConceptsToManifest(graph, manifest) {
  const allowedByScheme = new Map();
  for (const vocab of manifest.vocabularies || []) {
    const schemeId = manifestUrlToRdfId(vocab.scheme, "vocab-scheme");
    const allowed = new Set(
      (vocab.terms || []).map((t) => manifestUrlToRdfId(t, "vocab-term")),
    );
    allowedByScheme.set(schemeId, allowed);
  }

  for (const node of graph) {
    const allowed = allowedByScheme.get(node.id);
    if (!allowed) continue;
    if (!Array.isArray(node.hasTopConcept)) continue;
    node.hasTopConcept = node.hasTopConcept.filter((t) => allowed.has(t));
  }
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

  narrowSchemeTopConceptsToManifest(graph, manifest);

  return {
    "@context": buildContext(),
    "@graph": graph,
  };
}

/**
 * Annotation predicates that appear in the dist. Each is declared once as
 * an owl:AnnotationProperty in the OWL projection so an OWL reasoner /
 * editor (Protégé) doesn't complain about "untyped" predicates.
 */
const OWL_ANNOTATION_PREDICATES = [
  "rdfs:label",
  "rdfs:comment",
  "rdfs:seeAlso",
  "owl:versionInfo",
  "skos:prefLabel",
  "skos:altLabel",
  "skos:definition",
  "skos:scopeNote",
  "skos:notation",
  "skos:inScheme",
  "skos:topConceptOf",
  "skos:hasTopConcept",
  "skos:example",
  "skos:closeMatch",
  "dcterms:created",
  "dcterms:modified",
  "dcterms:identifier",
  "dcterms:title",
  "dcterms:license",
  "dcterms:source",
];

/**
 * Project a built distribution graph into OWL-friendly form.
 *
 *   rdfs:Class      -> owl:Class
 *   rdf:Property    -> owl:ObjectProperty   (best effort; the source has no
 *                                            domain/range info to drive a
 *                                            stricter Object/Datatype split)
 *   skos:Concept    -> owl:NamedIndividual + skos:Concept
 *   skos:ConceptScheme -> owl:NamedIndividual + skos:ConceptScheme
 *
 * Every annotation predicate used in the dist is also explicitly declared
 * as owl:AnnotationProperty at the top of the graph so the file imports
 * cleanly into Protégé and other OWL tooling.
 */
function projectGraphToOwl(distribution) {
  const annotationNodes = OWL_ANNOTATION_PREDICATES.map((p) => ({
    id: p,
    type: "owl:AnnotationProperty",
  }));

  const transformed = distribution["@graph"].map((node) => {
    const clone = { ...node };
    const original = clone.type;
    const types = Array.isArray(original) ? original.slice() : original ? [original] : [];
    const projected = [];
    for (const t of types) {
      if (t === "rdfs:Class") {
        projected.push("owl:Class");
      } else if (t === "rdf:Property") {
        projected.push("owl:ObjectProperty");
      } else if (t === "skos:Concept" || t === "Concept") {
        projected.push("owl:NamedIndividual");
        projected.push(t);
      } else if (t === "skos:ConceptScheme" || t === "ConceptScheme") {
        projected.push("owl:NamedIndividual");
        projected.push(t);
      } else {
        projected.push(t);
      }
    }
    if (projected.length === 1) clone.type = projected[0];
    else if (projected.length > 1) clone.type = projected;
    return clone;
  });

  return {
    "@context": distribution["@context"],
    "@graph": [...annotationNodes, ...transformed],
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

  // Filename is legacy: the file is a full OWL projection of the dist
  // (classes, properties, schemes, concepts, annotation properties), not
  // just "properties". The "-owl-properties" suffix is kept for backward
  // compatibility with consumers that bookmarked the URL before the
  // emitter was integrated into this build pipeline.
  const owlTtlPath = path.join(distDir, `datacite-${version}-owl-properties.ttl`);
  const owlJsonldPath = path.join(distDir, `datacite-${version}-owl.jsonld`);

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

  // OWL projection. The intermediate JSON-LD file is kept so consumers
  // that want JSON can read it directly, and so the TTL emission can
  // re-use riot rather than open-coding a TTL serializer.
  const owlGraph = projectGraphToOwl(distribution);
  writeJson(owlJsonldPath, owlGraph);
  console.log(`Wrote ${path.relative(projectRoot, owlJsonldPath)}`);
  console.log(`${owlGraph["@graph"].length} graph nodes (OWL projection)`);

  const wroteOwlTtl = writeRdfFormat(owlJsonldPath, owlTtlPath, "ttl");
  if (wroteOwlTtl) {
    console.log(`Wrote ${path.relative(projectRoot, owlTtlPath)}`);
  } else {
    die(
      "OWL projection build incomplete: TTL serialization failed. " +
        "Ensure the 'riot' tool is installed and on PATH.",
    );
  }
}

main();
