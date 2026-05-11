#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const basePath = "/linked-data";
const manifestFile = path.join(root, "manifest", "datacite-4.6.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readDirFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function readDirDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function relUrl(...parts) {
  return `${basePath}/${parts.join("/")}`.replace(/\/+/g, "/");
}

function fileMtimeLabel(absPath) {
  const stat = fs.statSync(absPath);
  return stat.mtime.toISOString().slice(0, 10);
}

function commonStyles() {
  return `
  :root {
    --dc-navy: #243B54;
    --dc-cyan: #00B1E2;
    --dc-blue: #5B88B9;
    --dc-teal: #46BCAB;
    --dc-mint: #90D7CD;
    --dc-magenta: #BC2B66;
    --dc-yellow: #EEEE98;
    --dc-coral: #F07C73;
    --bg: color-mix(in srgb, var(--dc-mint) 12%, white);
    --panel: color-mix(in srgb, white 95%, var(--dc-yellow) 5%);
    --panel-2: color-mix(in srgb, white 90%, var(--dc-mint) 10%);
    --text: var(--dc-navy);
    --muted: color-mix(in srgb, var(--dc-navy) 70%, var(--dc-blue));
    --line: color-mix(in srgb, var(--dc-blue) 28%, white);
    --accent: var(--dc-cyan);
    --accent-2: var(--dc-magenta);
    --accent-3: var(--dc-teal);
    --shadow: 0 10px 24px rgba(36, 59, 84, 0.08);
    --radius: 14px;
    --max: 1120px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: var(--dc-navy);
      --panel: color-mix(in srgb, var(--dc-navy) 82%, var(--dc-blue));
      --panel-2: color-mix(in srgb, var(--dc-navy) 68%, var(--dc-teal));
      --text: color-mix(in srgb, white 92%, var(--dc-mint));
      --muted: color-mix(in srgb, white 58%, var(--dc-mint));
      --line: color-mix(in srgb, var(--dc-blue) 35%, var(--dc-navy));
      --accent: var(--dc-cyan);
      --accent-2: var(--dc-coral);
      --accent-3: var(--dc-teal);
      --shadow: none;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--text);
    background:
      radial-gradient(1000px 500px at 95% -10%, color-mix(in srgb, var(--dc-coral) 20%, transparent), transparent 60%),
      radial-gradient(800px 420px at -10% 10%, color-mix(in srgb, var(--dc-cyan) 16%, transparent), transparent 65%),
      var(--bg);
    font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
    line-height: 1.45;
  }
  a {
    color: var(--accent);
    text-underline-offset: 0.12em;
    text-decoration-thickness: 0.08em;
  }
  a:hover { text-decoration-thickness: 0.12em; }
  .wrap { width: min(100% - 2rem, var(--max)); margin: 0 auto; }
  .topbar {
    position: sticky; top: 0; z-index: 10;
    backdrop-filter: blur(6px);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
  }
  .topbar .wrap {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem;
    padding: .7rem 0;
  }
  .brand { color: var(--text); text-decoration: none; font-weight: 700; }
  .nav { display: flex; flex-wrap: wrap; gap: .35rem; }
  .nav a {
    text-decoration: none; color: var(--muted); font-size: .95rem;
    padding: .35rem .55rem; border-radius: 999px;
  }
  .nav a:hover, .nav a:focus-visible { background: var(--panel-2); color: var(--text); outline: none; }
  main { padding: 1rem 0 2rem; }
  .hero, .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .hero { padding: 1.1rem; margin: 1rem 0; }
  .panel { padding: 1rem; margin: .9rem 0; }
  .eyebrow {
    display: inline-block;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--muted);
    border-radius: 999px;
    padding: .2rem .55rem;
    font-size: .82rem;
  }
  h1 { margin: .6rem 0 .35rem; line-height: 1.08; font-size: clamp(1.4rem, 2vw + 1rem, 2.2rem); }
  h2 { margin: 0 0 .6rem; font-size: 1.15rem; }
  h3 { margin: 0 0 .35rem; font-size: 1rem; }
  p { margin: .35rem 0 .75rem; }
  .muted { color: var(--muted); }
  .meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .5rem; }
  .chip {
    border: 1px solid var(--line); background: var(--panel-2); color: var(--muted);
    border-radius: 999px; padding: .25rem .55rem; font-size: .88rem;
  }
  .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: .75rem; }
  .card {
    grid-column: span 12;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: color-mix(in srgb, var(--panel) 94%, white 6%);
    padding: .8rem;
  }
  .card p { color: var(--muted); }
  .card .path { font-size: .9rem; color: var(--muted); word-break: break-word; }
  .list {
    margin: 0; padding: 0; list-style: none;
    border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
  }
  .list li + li { border-top: 1px solid var(--line); }
  .row {
    display: grid; grid-template-columns: 1.2fr 2fr auto; gap: .8rem;
    align-items: start; padding: .7rem .8rem;
    background: color-mix(in srgb, var(--panel) 95%, white 5%);
  }
  .row .name a { font-weight: 600; text-decoration: none; }
  .row .desc { color: var(--muted); }
  .row .meta-col { color: var(--muted); font-size: .9rem; white-space: nowrap; }
  .code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }
  .search {
    width: 100%; max-width: 420px;
    padding: .55rem .7rem; border-radius: 10px;
    border: 1px solid var(--line); background: var(--panel-2); color: var(--text);
    font: inherit;
  }
  .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-bottom: .7rem; }
  .footer { color: var(--muted); text-align: center; margin: 1rem 0 2rem; font-size: .95rem; }
  .small { font-size: .9rem; }
  @media (max-width: 800px) {
    .row { grid-template-columns: 1fr; gap: .35rem; }
    .row .meta-col { white-space: normal; }
  }
  @media (min-width: 700px) {
    .card.span-6 { grid-column: span 6; }
    .card.span-4 { grid-column: span 4; }
    .card.span-3 { grid-column: span 3; }
  }
  `;
}

function pageShell({ title, sectionLabel, lead, bodyHtml, navCurrent }) {
  const nav = [
    ["Home", relUrl("") + "/"],
    ["Classes", relUrl("class") + "/"],
    ["Properties", relUrl("property") + "/"],
    ["Controlled Terms", relUrl("vocab") + "/"],
    ["Contexts", relUrl("context") + "/"],
    ["Manifests", relUrl("manifest") + "/"],
  ]
    .map(([label, href]) => {
      const current = navCurrent === label ? ' aria-current="page"' : "";
      return `<a href="${href}"${current}>${escapeHtml(label)}</a>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · DataCite Linked Data (Staging)</title>
  <meta name="description" content="${escapeHtml(lead)}">
  <style>${commonStyles()}</style>
</head>
<body>
  <header class="topbar">
    <div class="wrap">
      <a class="brand" href="${relUrl("")}/">DataCite Linked Data</a>
      <nav class="nav" aria-label="Section navigation">${nav}</nav>
    </div>
  </header>
  <div class="wrap">
    <main>
      <section class="hero">
        <span class="eyebrow">${escapeHtml(sectionLabel)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="muted">${escapeHtml(lead)}</p>
      </section>
      ${bodyHtml}
    </main>
    <div class="footer">
      <a href="${relUrl("")}/">Back to /linked-data/</a>
    </div>
  </div>
</body>
</html>
`;
}

function parseClassOrProperty(dirName, file) {
  const abs = path.join(root, dirName, file);
  const json = readJson(abs);
  const name = file.replace(/\.jsonld$/i, "");
  const label = json["rdfs:label"] || name;
  const comment = json["rdfs:comment"] || "";
  const type = json["@type"] || json.type || "";
  return {
    name,
    file,
    label,
    comment,
    type,
    href: relUrl(dirName, file),
    mtime: fileMtimeLabel(abs),
  };
}

function renderFilterScript(inputId, itemSelector) {
  return `<script>
  (function () {
    const input = document.getElementById(${JSON.stringify(inputId)});
    if (!input) return;
    const items = Array.from(document.querySelectorAll(${JSON.stringify(itemSelector)}));
    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      for (const item of items) {
        const hay = (item.getAttribute('data-search') || '').toLowerCase();
        item.style.display = !q || hay.includes(q) ? '' : 'none';
      }
    });
  })();
  </script>`;
}

function buildClassIndex() {
  const items = readDirFiles(path.join(root, "class"))
    .filter((f) => f.endsWith(".jsonld"))
    .map((f) => parseClassOrProperty("class", f));

  const list = items
    .map(
      (item) => `<li>
        <div class="row" data-search="${escapeHtml(
          [item.name, item.label, item.comment, item.type].join(" "),
        )}">
          <div class="name">
            <a href="${item.href}">${escapeHtml(item.label)}</a>
            <div class="small muted code">${escapeHtml(item.file)}</div>
          </div>
          <div class="desc">${escapeHtml(item.comment || "No description available.")}</div>
          <div class="meta-col">${escapeHtml(item.type)}<br>${escapeHtml(item.mtime)}</div>
        </div>
      </li>`,
    )
    .join("");

  const body = `
    <section class="panel">
      <div class="toolbar">
        <input id="class-search" class="search" type="search" placeholder="Filter classes (name, label, description)">
        <span class="chip">${items.length} class definitions</span>
      </div>
      <ul class="list">${list}</ul>
    </section>
    ${renderFilterScript("class-search", ".row")}
  `;

  return pageShell({
    title: "Class Definitions",
    sectionLabel: "Classes",
    lead: "Browse JSON-LD class definitions for DataCite entities such as Resource, Creator, and Title.",
    bodyHtml: body,
    navCurrent: "Classes",
  });
}

function buildPropertyIndex() {
  const items = readDirFiles(path.join(root, "property"))
    .filter((f) => f.endsWith(".jsonld"))
    .map((f) => parseClassOrProperty("property", f));

  const list = items
    .map(
      (item) => `<li>
        <div class="row" data-search="${escapeHtml(
          [item.name, item.label, item.comment, item.type].join(" "),
        )}">
          <div class="name">
            <a href="${item.href}">${escapeHtml(item.label)}</a>
            <div class="small muted code">${escapeHtml(item.file)}</div>
          </div>
          <div class="desc">${escapeHtml(item.comment || "No description available.")}</div>
          <div class="meta-col">${escapeHtml(item.type)}<br>${escapeHtml(item.mtime)}</div>
        </div>
      </li>`,
    )
    .join("");

  const body = `
    <section class="panel">
      <div class="toolbar">
        <input id="property-search" class="search" type="search" placeholder="Filter properties (name, label, description)">
        <span class="chip">${items.length} property definitions</span>
      </div>
      <ul class="list">${list}</ul>
    </section>
    ${renderFilterScript("property-search", ".row")}
  `;

  return pageShell({
    title: "Property Definitions",
    sectionLabel: "Properties",
    lead: "Browse JSON-LD property definitions for DataCite metadata fields such as identifier, creatorName, and publicationYear.",
    bodyHtml: body,
    navCurrent: "Properties",
  });
}

function buildVocabIndex() {
  const manifest = readJson(manifestFile);
  const vocabRoot = path.join(root, "vocab");
  const dirs = readDirDirs(vocabRoot).filter((dir) =>
    fs.existsSync(path.join(vocabRoot, dir, `${dir}.jsonld`)),
  );

  const manifestMap = new Map();
  for (const v of manifest.vocabularies) {
    const parts = v.scheme.replace(manifest.namespace, "").split("/");
    const dir = parts[1];
    manifestMap.set(dir, v);
  }

  const cards = dirs
    .map((dir) => {
      const schemePath = path.join(vocabRoot, dir, `${dir}.jsonld`);
      const schemeJson = readJson(schemePath);
      const graphNode = Array.isArray(schemeJson["@graph"]) ? schemeJson["@graph"][0] : null;
      const title = (graphNode && graphNode.title) || dir;
      const topConcepts =
        (graphNode && Array.isArray(graphNode.hasTopConcept) && graphNode.hasTopConcept.length) || 0;
      const files = readDirFiles(path.join(vocabRoot, dir)).filter((f) => f.endsWith(".jsonld"));
      const termFiles = files.filter((f) => f !== "context.jsonld" && f !== `${dir}.jsonld`);
      const manifestEntry = manifestMap.get(dir);
      const termUrls = (manifestEntry && manifestEntry.terms) || [];
      const sampleTerms = termUrls.slice(0, 5).map((u) => u.split("/").pop());

      const links = [
        `<a href="${relUrl("vocab", dir, `${dir}.jsonld`)}">Scheme file</a>`,
        fs.existsSync(path.join(vocabRoot, dir, "context.jsonld"))
          ? `<a href="${relUrl("vocab", dir, "context.jsonld")}">Context</a>`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `<article class="card span-6">
        <h3>${escapeHtml(dir)}</h3>
        <p>${escapeHtml(title)}</p>
        <p class="small muted">${escapeHtml(
          `${termFiles.length} term files · ${topConcepts} top concepts · updated ${fileMtimeLabel(schemePath)}`,
        )}</p>
        <p>${links}</p>
        ${
          sampleTerms.length
            ? `<p class="path"><span class="small muted">Examples:</span> ${sampleTerms
                .map((t) => `<a href="${relUrl("vocab", dir, t)}">${escapeHtml(t.replace(/\.jsonld$/i, ""))}</a>`)
                .join(", ")}</p>`
            : ""
        }
      </article>`;
    })
    .join("");

  const body = `
    <section class="panel">
      <p class="muted">Controlled terms are grouped into vocabulary schemes. Open a scheme file for the concept scheme, or open individual term files for specific values.</p>
      <div class="grid">${cards}</div>
    </section>
  `;

  return pageShell({
    title: "Controlled Terms (Vocabularies)",
    sectionLabel: "Controlled Terms",
    lead: "Browse DataCite controlled vocabularies and term files (for example resourceTypeGeneral, relationType, and contributorType).",
    bodyHtml: body,
    navCurrent: "Controlled Terms",
  });
}

function buildContextIndex() {
  const localContextFiles = readDirFiles(path.join(root, "context")).filter((f) => f.endsWith(".jsonld"));
  const vocabContextFiles = [];
  if (fs.existsSync(path.join(root, "vocab", "context.jsonld"))) {
    vocabContextFiles.push("vocab/context.jsonld");
  }
  for (const dir of readDirDirs(path.join(root, "vocab"))) {
    const rel = path.join("vocab", dir, "context.jsonld");
    if (fs.existsSync(path.join(root, rel))) vocabContextFiles.push(rel);
  }

  function renderRows(paths) {
    return paths
      .map((rel) => {
        const abs = path.join(root, rel);
        let note = "";
        try {
          const json = readJson(abs);
          if (json["@context"]) {
            const keys = Object.keys(json["@context"]).length;
            note = `JSON-LD context with ${keys} top-level mapping${keys === 1 ? "" : "s"}`;
          } else {
            note = "JSON-LD file";
          }
        } catch {
          note = "JSON-LD file";
        }
        return `<li>
          <div class="row">
            <div class="name">
              <a href="${relUrl(...rel.split(path.sep))}">${escapeHtml(path.basename(rel))}</a>
              <div class="small muted code">${escapeHtml(rel.replace(/\\/g, "/"))}</div>
            </div>
            <div class="desc">${escapeHtml(note)}</div>
            <div class="meta-col">${escapeHtml(fileMtimeLabel(abs))}</div>
          </div>
        </li>`;
      })
      .join("");
  }

  const body = `
    <section class="panel">
      <h2>Core Contexts</h2>
      <ul class="list">${renderRows(localContextFiles.map((f) => path.join("context", f)))}</ul>
    </section>
    <section class="panel">
      <h2>Vocabulary Contexts</h2>
      <p class="muted">Vocabulary-specific contexts plus the top-level <span class="code">vocab/context.jsonld</span>.</p>
      <ul class="list">${renderRows(vocabContextFiles)}</ul>
    </section>
  `;

  return pageShell({
    title: "JSON-LD Contexts",
    sectionLabel: "Contexts",
    lead: "Browse JSON-LD context files used to map compact DataCite-style keys to linked-data identifiers (IRIs).",
    bodyHtml: body,
    navCurrent: "Contexts",
  });
}

function buildManifestIndex() {
  const files = readDirFiles(path.join(root, "manifest")).filter((f) => f.endsWith(".json"));

  const cards = files
    .map((file) => {
      const abs = path.join(root, "manifest", file);
      const json = readJson(abs);
      const summary = {
        classes: (json.classes || []).length,
        properties: (json.properties || []).length,
        contexts: (json.context || []).length,
        vocabularies: (json.vocabularies || []).length,
        vocabTerms: (json.vocabularies || []).reduce((n, v) => n + (v.terms || []).length, 0),
      };
      return `<article class="card span-6">
        <h3>${escapeHtml(file)}</h3>
        <p class="muted">Version ${escapeHtml(json.version || "unknown")} · namespace <span class="code">${escapeHtml(json.namespace || "")}</span></p>
        <p>
          <a href="${relUrl("manifest", file)}">Open manifest</a>
        </p>
        <p class="small muted">
          ${escapeHtml(
            `${summary.classes} classes · ${summary.properties} properties · ${summary.contexts} contexts · ${summary.vocabularies} vocabularies · ${summary.vocabTerms} terms`,
          )}
        </p>
        <p class="small muted">Updated ${escapeHtml(fileMtimeLabel(abs))}</p>
      </article>`;
    })
    .join("");

  const body = `
    <section class="panel">
      <p class="muted">Manifest files are machine-readable inventories of linked-data resources by DataCite schema version.</p>
      <div class="grid">${cards}</div>
    </section>
  `;

  return pageShell({
    title: "Manifest Index",
    sectionLabel: "Manifests",
    lead: "Browse versioned manifest files that list the classes, properties, contexts, vocabulary schemes, and term files in this namespace.",
    bodyHtml: body,
    navCurrent: "Manifests",
  });
}

function writeFile(relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log(`Wrote ${relPath}`);
}

function main() {
  writeFile(path.join("class", "index.html"), buildClassIndex());
  writeFile(path.join("property", "index.html"), buildPropertyIndex());
  writeFile(path.join("vocab", "index.html"), buildVocabIndex());
  writeFile(path.join("context", "index.html"), buildContextIndex());
  writeFile(path.join("manifest", "index.html"), buildManifestIndex());
}

main();
