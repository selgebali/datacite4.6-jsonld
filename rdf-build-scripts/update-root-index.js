#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { compareVersions, resolveVocabRoot } = require("./lib/versioning");

const projectRoot = process.cwd();
const vocabRoot = resolveVocabRoot(projectRoot);
const indexPath = path.join(vocabRoot, "index.html");
const currentManifestPath = path.join(vocabRoot, "manifest", "datacite-current.json");

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

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    die(`Failed to read text: ${file}\n${err.message}`);
  }
}

function writeText(file, value) {
  fs.writeFileSync(file, value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function versionLink(version) {
  return {
    manifest: `/linked-data/manifest/datacite-${version}.json`,
    dist: `/linked-data/dist/datacite-${version}.jsonld`,
  };
}

function releaseMatrixLink(fromVersion, toVersion) {
  return `/linked-data/manifest/release-matrix-${fromVersion}-${toVersion}.json`;
}

function orderedVersions(pointer) {
  const currentVersion = String(pointer.currentVersion || "");
  const versions = Array.isArray(pointer.availableVersions) ? pointer.availableVersions : [];
  const unique = Array.from(new Set(versions.map((entry) => String(entry.version || "")).filter(Boolean)));
  unique.sort((a, b) => compareVersions(b, a));

  if (currentVersion && !unique.includes(currentVersion)) {
    unique.unshift(currentVersion);
  }

  return currentVersion
    ? [currentVersion, ...unique.filter((version) => version !== currentVersion)]
    : unique;
}

function replaceAutoBlock(html, name, content, indent) {
  const start = `<!-- AUTO ${name}:start -->`;
  const end = `<!-- AUTO ${name}:end -->`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (!pattern.test(html)) {
    die(`Auto-update markers not found for block: ${name}`);
  }

  return html.replace(pattern, `${start}\n${content}\n${indent}${end}`);
}

function buildCurrentMeta(currentVersion) {
  return [
    '          <span class="chip">Audience: Developers, metadata engineers, tool builders</span>',
    `          <span class="chip">Current staged version: DataCite ${currentVersion}</span>`,
    '          <span class="chip">Single-file import: <a href="/linked-data/dist/datacite.jsonld">latest full bundle</a></span>',
    '          <span class="chip">Machine entry point: <a href="/linked-data/manifest/datacite-current.json">current manifest pointer</a></span>',
  ].join("\n");
}

function buildStartLinks(currentVersion, versions) {
  const currentLinks = versionLink(currentVersion);
  const quickLinks = versions
    .map((version) => {
      const links = versionLink(version);
      return `            <p><a href="${links.manifest}">${version} manifest</a> · <a href="${links.dist}">${version} bundle</a></p>`;
    })
    .join("\n");

  return [
    '          <article class="card span-6">',
    "            <h3>I need the latest single importable bundle</h3>",
    "            <p>Open the moving latest distribution if you want one file with classes, properties, vocabularies, and metadata together.</p>",
    '            <a href="/linked-data/dist/datacite.jsonld">Open latest bundle</a>',
    '            <div class="path"><code>/linked-data/dist/datacite.jsonld</code></div>',
    "          </article>",
    '          <article class="card span-6">',
    `            <h3>I need a machine-readable index of everything (v${currentVersion})</h3>`,
    "            <p>Open the manifest to discover classes, properties, vocabulary schemes, and terms.</p>",
    `            <a href="${currentLinks.manifest}">Open v${currentVersion} manifest</a>`,
    `            <div class="path"><code>${currentLinks.manifest}</code></div>`,
    "          </article>",
    '          <article class="card span-12">',
    "            <h3>Version Quick Links</h3>",
    "            <p>Use the moving latest bundle for full imports, current pointers for machine discovery, or open a frozen version directly.</p>",
    '            <p><a href="/linked-data/dist/datacite.jsonld">Latest full bundle</a> · <a href="/linked-data/manifest/datacite-current.json">Current manifest pointer</a> · <a href="/linked-data/dist/datacite-current.jsonld">Current distribution pointer</a></p>',
    quickLinks,
    "          </article>",
  ].join("\n");
}

function buildVersionList(currentVersion, versions) {
  return versions
    .map((version, index) => {
      const links = versionLink(version);
      if (version === currentVersion) {
        return [
          `            <p><strong>DataCite ${version}</strong> (current staged set)</p>`,
          `            <p class="muted">This staged namespace currently exposes a DataCite ${version} linked-data set with JSON-LD class, property, vocabulary, context, manifest, and distribution resources.</p>`,
          '            <p><a href="/linked-data/dist/datacite.jsonld">Open the moving latest full bundle</a></p>',
          `            <p><a href="${links.manifest}">Open the DataCite ${version} manifest</a></p>`,
          `            <p><a href="${links.dist}">Open the DataCite ${version} bundle</a></p>`,
        ].join("\n");
      }

      const label = index === 1 ? "frozen previous version" : "frozen version";
      return [
        `            <p><strong>DataCite ${version}</strong> (${label})</p>`,
        `            <p class="muted">DataCite ${version} remains available as a versioned snapshot for compatibility and historical reference.</p>`,
        `            <p><a href="${links.manifest}">Open the DataCite ${version} manifest</a></p>`,
        `            <p><a href="${links.dist}">Open the DataCite ${version} bundle</a></p>`,
      ].join("\n");
    })
    .join("\n");
}

function summarizeChange(change) {
  if (!change || typeof change !== "object") return null;

  if (change.kind === "controlled-term-added") {
    const values = Array.isArray(change.values) ? change.values.join(", ") : "";
    return `Added ${escapeHtml(change.target)} terms: ${escapeHtml(values)}`;
  }
  if (change.kind === "sub-property-added") {
    return `Added ${escapeHtml(change.property)} under ${escapeHtml(change.target)}`;
  }
  if (change.kind === "property-group-added") {
    const properties = Array.isArray(change.properties) ? change.properties.join(", ") : "";
    return `Added ${escapeHtml(change.target)} subproperties: ${escapeHtml(properties)}`;
  }
  if (change.kind === "complex-structure-added") {
    return `Added ${escapeHtml(change.target)} structure`;
  }
  return null;
}

function buildVersionNotes(versions) {
  const transitions = [];

  for (let i = 0; i < versions.length - 1; i += 1) {
    const toVersion = versions[i];
    const fromVersion = versions[i + 1];
    const matrixPath = path.join(vocabRoot, "manifest", `release-matrix-${fromVersion}-${toVersion}.json`);

    if (!fs.existsSync(matrixPath)) continue;

    const matrix = readJson(matrixPath);
    const summarized = (Array.isArray(matrix.changes) ? matrix.changes : [])
      .map(summarizeChange)
      .filter(Boolean);

    transitions.push({
      fromVersion,
      link: releaseMatrixLink(fromVersion, toVersion),
      releaseDate: matrix.releaseDate || null,
      summarized,
      toVersion,
    });
  }

  if (!transitions.length) {
    return [
      '            <strong>Version changes</strong>',
      "            <p>No release-matrix summaries are available yet.</p>",
    ].join("\n");
  }

  const lines = ['            <strong>What Changed Between Versions</strong>'];
  for (const transition of transitions) {
    const label = `${transition.fromVersion} -> ${transition.toVersion}`;
    const dateSuffix = transition.releaseDate ? ` (${transition.releaseDate})` : "";
    lines.push(`            <p><strong>DataCite ${escapeHtml(label)}</strong>${escapeHtml(dateSuffix)}</p>`);
    if (transition.summarized.length) {
      lines.push(`            <p class="muted">${transition.summarized.map((e) => `${e}.`).join(" ")}</p>`);
    } else {
      lines.push('            <p class="muted">A release matrix exists for this transition, but no summarized change items were found.</p>');
    }
    lines.push(`            <p><a href="${transition.link}">Open release matrix</a></p>`);
  }

  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(currentManifestPath)) {
    console.log(`Skipping root index update: ${path.relative(projectRoot, currentManifestPath)} does not exist yet.`);
    console.log("Run update-current-pointers.js first to create it.");
    return;
  }

  if (!fs.existsSync(indexPath)) {
    console.log(`Skipping root index update: ${path.relative(projectRoot, indexPath)} does not exist.`);
    console.log("Create rdf-vocabulary-staging/index.html with AUTO marker blocks first.");
    return;
  }

  const pointer = readJson(currentManifestPath);
  const currentVersion = String(pointer.currentVersion || "");

  if (!currentVersion) {
    die(`currentVersion missing in ${path.relative(projectRoot, currentManifestPath)}`);
  }

  const versions = orderedVersions(pointer);
  const original = readText(indexPath);
  let next = original;

  next = replaceAutoBlock(next, "current-meta", buildCurrentMeta(currentVersion), "          ");
  next = replaceAutoBlock(next, "start-links", buildStartLinks(currentVersion, versions), "          ");
  next = replaceAutoBlock(next, "versions-list", buildVersionList(currentVersion, versions), "            ");
  next = replaceAutoBlock(next, "version-notes", buildVersionNotes(versions), "          ");

  if (next !== original) {
    writeText(indexPath, next);
    console.log(`Wrote ${path.relative(projectRoot, indexPath)}`);
  } else {
    console.log(`No changes needed for ${path.relative(projectRoot, indexPath)}`);
  }
}

main();
