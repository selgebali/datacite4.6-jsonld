const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lowercaseInitial(value) {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    mdash: "-",
    ndash: "-",
    hellip: "...",
    rsquo: "'",
    lsquo: "'",
    rdquo: "\"",
    ldquo: "\"",
  };

  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] || match);
}

function stripTags(value) {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, ""));
}

function normalizeWhitespace(value) {
  return String(value)
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function cleanInlineText(value) {
  return normalizeWhitespace(stripTags(value));
}

function cleanPreText(value) {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, "")).replace(/\r/g, "").trim();
}

function cleanDefinitionText(value) {
  return normalizeWhitespace(
    cleanInlineText(value)
      .replace(/\b\d+(?:\.\d+)*(?:\.[a-z])?\s+/gi, "")
      .replace(/\s+([,.;:])/g, "$1"),
  );
}

function cleanReferenceText(value) {
  return normalizeWhitespace(
    cleanInlineText(value)
      .replace(/\b\d+(?:\.\d+)*(?:\.[a-z])?\s+/gi, "")
      .replace(/\s+([,.;:])/g, "$1"),
  );
}

async function fetchText(url) {
  if (typeof fetch !== "function") {
    die("This script requires a Node.js runtime with global fetch support.");
  }

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "user-agent": "schema.datacite.org-linked-data modular release importer",
        accept: "text/html,application/xml,text/xml,text/plain,*/*",
      },
    });
  } catch (err) {
    die(`Failed to fetch ${url}\n${err.message}`);
  }

  if (!response.ok) {
    die(`Failed to fetch ${url}\nHTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function runNodeScript(repoRoot, scriptRelPath, args) {
  const scriptAbsPath = path.join(repoRoot, scriptRelPath);
  const result = spawnSync(process.execPath, [scriptAbsPath, ...(args || [])], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) {
    die(`Failed to run ${scriptRelPath}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    die(`${scriptRelPath} exited with status ${result.status}`);
  }
}

function extractSectionById(html, sectionId) {
  const startPattern = new RegExp(`<section id="${escapeRegExp(sectionId)}">`);
  const startMatch = startPattern.exec(html);
  if (!startMatch) return null;

  let depth = 0;
  const startIndex = startMatch.index;
  const tokenPattern = /<section\b[^>]*>|<\/section>/g;
  tokenPattern.lastIndex = startIndex;

  let tokenMatch;
  while ((tokenMatch = tokenPattern.exec(html))) {
    if (tokenMatch[0].startsWith("<section")) {
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        return html.slice(startIndex, tokenPattern.lastIndex);
      }
    }
  }

  return html.slice(startIndex);
}

function extractTagContents(fragment, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return Array.from(fragment.matchAll(regex)).map((match) => match[1]);
}

function extractParagraphTexts(fragment) {
  return extractTagContents(fragment, "p").map((paragraph) => cleanInlineText(paragraph)).filter(Boolean);
}

function extractListItemsWithLinks(sectionHtml, baseUrl) {
  if (!sectionHtml) return [];

  return Array.from(sectionHtml.matchAll(/<li>\s*<p>([\s\S]*?)<\/p>/g))
    .map((match) => {
      const hrefs = Array.from(match[1].matchAll(/href="([^"]+)"/g))
        .map((hrefMatch) => {
          try {
            return new URL(hrefMatch[1], baseUrl).toString();
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return {
        text: cleanInlineText(match[1]),
        hrefs: unique(hrefs),
      };
    })
    .filter((item) => item.text && !/^These values may be used/i.test(item.text));
}

function parseLabeledBlocks(fragment) {
  const blocks = {};
  let currentLabel = null;
  const tokenPattern = /<(p|pre)[^>]*>([\s\S]*?)<\/\1>/gi;

  for (const match of fragment.matchAll(tokenPattern)) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === "p") {
      const labelMatch = inner.match(/^\s*<strong>([^<]+):\s*<\/strong>\s*([\s\S]*)$/i);
      if (labelMatch) {
        currentLabel = cleanInlineText(labelMatch[1]);
        if (!blocks[currentLabel]) {
          blocks[currentLabel] = { inline: null, paragraphs: [], pre: [] };
        }

        const inline = cleanInlineText(labelMatch[2]);
        if (inline) {
          if (!blocks[currentLabel].inline) {
            blocks[currentLabel].inline = inline;
          } else {
            blocks[currentLabel].paragraphs.push(inline);
          }
        }
        continue;
      }

      const paragraph = cleanInlineText(inner);
      if (paragraph && currentLabel) {
        if (!blocks[currentLabel]) {
          blocks[currentLabel] = { inline: null, paragraphs: [], pre: [] };
        }
        blocks[currentLabel].paragraphs.push(paragraph);
      }
      continue;
    }

    if (tag === "pre" && currentLabel) {
      if (!blocks[currentLabel]) {
        blocks[currentLabel] = { inline: null, paragraphs: [], pre: [] };
      }
      const pre = cleanPreText(inner);
      if (pre) {
        blocks[currentLabel].pre.push(pre);
      }
    }
  }

  return blocks;
}

function buildConceptFile(namespace, vocabName, termName, details) {
  const json = {
    "@context": "./context.jsonld",
    id: `${namespace}vocab/${vocabName}/${termName}`,
    type: "Concept",
    prefLabel: details.prefLabel || termName,
  };

  if (details.altLabel) {
    json.altLabel = details.altLabel;
  }

  json.notation = termName;
  if (details.definition) {
    json.definition = details.definition;
  }
  if (details.scopeNote) {
    json.scopeNote = details.scopeNote;
  }
  if (details.example && details.example.length) {
    json.example = details.example;
  }

  json.inScheme = `${namespace}vocab/${vocabName}`;
  json.topConceptOf = `${namespace}vocab/${vocabName}`;
  return json;
}

function buildPropertyFile(namespace, propertyName, definition) {
  return {
    "@context": {
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      schema: namespace,
      datacite: namespace,
    },
    "@id": `${namespace}property/${propertyName}`,
    "@type": "rdf:Property",
    "rdfs:label": propertyName,
    "rdfs:comment": definition,
  };
}

function buildClassFile(namespace, className, comment) {
  return {
    "@context": {
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      schema: namespace,
      datacite: namespace,
    },
    "@id": `${namespace}class/${className}`,
    "@type": "rdfs:Class",
    "rdfs:label": className,
    "rdfs:comment": comment,
  };
}

module.exports = {
  buildClassFile,
  buildConceptFile,
  buildPropertyFile,
  cleanDefinitionText,
  cleanInlineText,
  cleanPreText,
  cleanReferenceText,
  decodeHtmlEntities,
  die,
  escapeRegExp,
  extractListItemsWithLinks,
  extractParagraphTexts,
  extractSectionById,
  extractTagContents,
  fetchText,
  lowercaseInitial,
  normalizeWhitespace,
  parseLabeledBlocks,
  readJson,
  readText,
  runNodeScript,
  stableStringify,
  unique,
  writeJson,
  writeText,
};
