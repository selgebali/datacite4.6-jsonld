const path = require("path");
const {
  cleanDefinitionText,
  cleanInlineText,
  cleanReferenceText,
  extractListItemsWithLinks,
  extractSectionById,
  lowercaseInitial,
  parseLabeledBlocks,
  readJson,
  unique,
} = require("./shared");
const {
  canonicalClassPath,
  canonicalConceptPath,
  canonicalPropertyPath,
  canonicalSchemePath,
  complexStructureBlueprints,
  controlledListDescriptors,
  normalizeRelationTypeSectionId,
  normalizeSimpleSectionId,
  propertyGroupBlueprints,
  simplePropertyDescriptors,
} = require("./descriptors");

function parseXsdEnumValues(xsdText) {
  return Array.from(xsdText.matchAll(/<xs:enumeration\s+value="([^"]+)"\s*\/>/g)).map((match) => match[1]);
}

function diffValues(previousValues, nextValues) {
  const previous = new Set(previousValues);
  const next = new Set(nextValues);

  return {
    added: nextValues.filter((value) => !previous.has(value)),
    removed: previousValues.filter((value) => !next.has(value)),
  };
}

function parseNamedXsdItems(xsdText) {
  const parse = (tag) =>
    unique(Array.from(xsdText.matchAll(new RegExp(`<xs:${tag}\\b[^>]*\\bname="([^"]+)"`, "g"))).map((match) => match[1]));

  return {
    attributes: parse("attribute"),
    complexTypes: parse("complexType"),
    elements: parse("element"),
    groups: parse("group"),
  };
}

function diffNamedXsdItems(previousXsd, nextXsd) {
  const previous = parseNamedXsdItems(previousXsd);
  const next = parseNamedXsdItems(nextXsd);

  return {
    attributes: diffValues(previous.attributes, next.attributes),
    complexTypes: diffValues(previous.complexTypes, next.complexTypes),
    elements: diffValues(previous.elements, next.elements),
    groups: diffValues(previous.groups, next.groups),
  };
}

function normalizePropertyName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractReleaseNotesSections(releaseNotesHtml, releaseNotesUrl) {
  const schemaSection = extractSectionById(releaseNotesHtml, "schema-changes");
  const documentationSection = extractSectionById(releaseNotesHtml, "documentation-changes");

  return {
    documentationBullets: extractListItemsWithLinks(documentationSection, releaseNotesUrl),
    schemaBullets: extractListItemsWithLinks(schemaSection, releaseNotesUrl),
  };
}

function firstMatchingBlock(blocks, labels) {
  for (const label of labels || []) {
    if (blocks[label]) {
      return blocks[label];
    }
  }
  return null;
}

function firstMatchingValue(blocks, labels) {
  const block = firstMatchingBlock(blocks, labels);
  if (!block) return null;
  return block.inline || block.paragraphs[0] || null;
}

function stripSuggestedMapping(value) {
  return String(value)
    .replace(/\n+\s*Suggested Dublin Core Mapping:[\s\S]*$/i, "")
    .replace(/\s*Suggested Dublin Core Mapping:[\s\S]*$/i, "")
    .trim();
}

function extractControlledListTermDetails(fragment, descriptor, termName) {
  const blocks = parseLabeledBlocks(fragment);
  const definitionBlock = firstMatchingBlock(blocks, descriptor.fieldProfile.definitionLabels);
  const altLabel = firstMatchingValue(blocks, descriptor.fieldProfile.altLabelLabels);
  const notesBlock = firstMatchingBlock(blocks, descriptor.fieldProfile.notesLabels);
  const exampleBlock = firstMatchingBlock(blocks, descriptor.fieldProfile.exampleLabels) || notesBlock;

  let definition = definitionBlock ? definitionBlock.inline || definitionBlock.paragraphs[0] || null : null;
  if (definition) {
    definition = cleanDefinitionText(definition);
    if (typeof descriptor.fieldProfile.definitionTransform === "function") {
      definition = descriptor.fieldProfile.definitionTransform(definition);
    }
  }

  const rawScopeNotes = [];
  if (notesBlock) {
    rawScopeNotes.push(...notesBlock.paragraphs.map(cleanReferenceText));
  }
  if (descriptor.fieldProfile.useDefinitionParagraphsAsScopeNote && definitionBlock) {
    rawScopeNotes.push(...definitionBlock.paragraphs.map(cleanReferenceText));
  }

  const exampleParagraph = (exampleBlock ? exampleBlock.paragraphs : []).find((paragraph) => /^\s*</.test(paragraph));
  const example = exampleBlock && exampleBlock.pre.length
    ? [stripSuggestedMapping(exampleBlock.pre[0])]
    : exampleParagraph
      ? [stripSuggestedMapping(exampleParagraph)]
      : null;
  const examplePlainTexts = new Set(
    (example || [])
      .map((entry) => cleanInlineText(entry))
      .filter(Boolean),
  );

  const scopeNotes = unique(
    rawScopeNotes.filter(
      (paragraph) => {
        const cleaned = stripSuggestedMapping(paragraph);
        return (
          cleaned &&
          !/^\s*</.test(cleaned) &&
          !examplePlainTexts.has(cleaned) &&
          !/^Suggested Dublin Core Mapping/i.test(cleaned) &&
          !/^Previous$/i.test(cleaned) &&
          !/^Next$/i.test(cleaned) &&
          !/^This work is licensed/i.test(cleaned)
        );
      },
    ),
  ).map(stripSuggestedMapping).filter(Boolean);

  const normalizedExample = (example || [])
    .map(stripSuggestedMapping)
    .filter(Boolean);

  return {
    altLabel: altLabel && altLabel !== termName ? altLabel : null,
    definition,
    example: normalizedExample.length ? normalizedExample : null,
    prefLabel: termName,
    scopeNote: scopeNotes.length ? scopeNotes.join("\n") : null,
  };
}

function possibleSectionIds(descriptor, termName) {
  return unique([
    descriptor.sectionId(termName),
    normalizeSimpleSectionId(termName),
    normalizeRelationTypeSectionId(termName),
    normalizePropertyName(termName),
  ]);
}

function findTermSection(html, descriptor, termName) {
  for (const sectionId of possibleSectionIds(descriptor, termName)) {
    const section = extractSectionById(html, sectionId);
    if (section) {
      return section;
    }
  }
  return null;
}

function matchBulletText(bullets, matchers) {
  return (bullets || []).some((bullet) => (matchers || []).some((matcher) => matcher.test(bullet.text)));
}

function bulletsForPropertyName(bullets, propertyName) {
  const normalized = normalizePropertyName(propertyName);
  return (bullets || []).filter((bullet) => normalizePropertyName(bullet.text).includes(normalized));
}

function findPropertySectionCandidates(html, propertyName) {
  const normalizedName = normalizePropertyName(propertyName);
  return Array.from(html.matchAll(/<section id="([^"]+)">/g))
    .map((match) => match[1])
    .filter((id) => normalizePropertyName(id).includes(normalizedName));
}

function extractPropertyDetailsFromHtml(html, propertyName) {
  const candidates = findPropertySectionCandidates(html, propertyName);
  for (const sectionId of candidates) {
    const section = extractSectionById(html, sectionId);
    if (!section) {
      continue;
    }

    const blocks = parseLabeledBlocks(section);
    const definition = firstMatchingValue(blocks, ["Definition", "Description"]);
    const occurrences = firstMatchingValue(blocks, ["Occurrences"]);
    if (!definition) {
      continue;
    }

    return {
      definition: cleanDefinitionText(definition),
      occurrences: occurrences ? cleanInlineText(occurrences) : null,
      sectionId,
    };
  }

  return null;
}

function readCanonicalJsonFiles(paths) {
  return paths.map((filePath) => ({
    filePath,
    value: readJson(filePath),
  }));
}

function collectContextEntries(repoRoot, keys) {
  const contextPath = path.join(repoRoot, "context", "fullcontext.jsonld");
  const contextJson = readJson(contextPath);
  const context = contextJson["@context"] || {};
  const orderedKeys = Object.keys(context);

  return (keys || []).map((key) => {
    const index = orderedKeys.indexOf(key);
    const afterKey = index > 0 ? orderedKeys[index - 1] : null;
    return {
      afterKey,
      key,
      value: context[key],
    };
  });
}

function releaseMatrixTarget(previousVersion, version) {
  return `manifest/release-matrix-${previousVersion}-${version}.json`;
}

function buildControlledListTargets(repoRoot, descriptor, terms, previousVersion, version) {
  return unique([
    canonicalSchemePath(repoRoot, descriptor.vocabName),
    ...terms.map((term) => canonicalConceptPath(repoRoot, descriptor.vocabName, term)),
  ]).map((target) => path.relative(repoRoot, target)).concat(releaseMatrixTarget(previousVersion, version));
}

function buildSimplePropertyInputs(repoRoot, descriptor) {
  const propertyPath = canonicalPropertyPath(repoRoot, descriptor.propertyName);
  const propertyFile = readJson(propertyPath);
  return {
    contextEntries: collectContextEntries(repoRoot, descriptor.contextKeys),
    propertyFile,
    releaseMatrixChanges: descriptor.releaseMatrixChanges,
  };
}

function buildBlueprintInputs(repoRoot, blueprint) {
  return {
    classFiles: readCanonicalJsonFiles((blueprint.classFiles || []).map((className) => canonicalClassPath(repoRoot, className))),
    contextEntries: collectContextEntries(repoRoot, blueprint.contextKeys),
    propertyFiles: readCanonicalJsonFiles((blueprint.propertyFiles || []).map((propertyName) => canonicalPropertyPath(repoRoot, propertyName))),
    releaseMatrixChanges: blueprint.releaseMatrixChanges,
  };
}

function createChange({
  confidence,
  evidence,
  id,
  inputs,
  kind,
  module,
  notes,
  section,
  status,
  summary,
  targets,
}) {
  return {
    confidence,
    evidence: evidence || [],
    id,
    inputs: inputs || {},
    kind,
    module,
    notes: notes || [],
    section: section || null,
    status,
    summary,
    targets: targets || [],
  };
}

async function detectControlledListChanges(repoRoot, version, previousVersion, evidenceLoader) {
  const changes = [];
  const sources = [];

  for (const descriptor of controlledListDescriptors) {
    const previousUrl = evidenceLoader.includeXsdUrl(previousVersion, descriptor.xsdIncludeFile);
    const nextUrl = evidenceLoader.includeXsdUrl(version, descriptor.xsdIncludeFile);
    const appendixUrl = evidenceLoader.versionedDocsUrl(descriptor.appendixPath);
    const previousXsd = await evidenceLoader.get(previousUrl);
    const nextXsd = await evidenceLoader.get(nextUrl);
    const diff = diffValues(parseXsdEnumValues(previousXsd), parseXsdEnumValues(nextXsd));

    sources.push(previousUrl, nextUrl, appendixUrl);

    if (diff.added.length) {
      const appendixHtml = await evidenceLoader.get(appendixUrl);
      const terms = diff.added.map((termName) => {
        const section = findTermSection(appendixHtml, descriptor, termName);
        if (!section) {
          return {
            name: termName,
            details: { prefLabel: termName },
          };
        }

        return {
          name: termName,
          details: extractControlledListTermDetails(section, descriptor, termName),
        };
      });

      changes.push(
        createChange({
          confidence: "high",
          evidence: [appendixUrl, previousUrl, nextUrl],
          id: `controlled-list-values-added:${descriptor.id}:${version}`,
          inputs: {
            descriptorId: descriptor.id,
            orderedTerms: parseXsdEnumValues(nextXsd),
            releaseMatrixChanges: [
              {
                kind: "controlled-term-added",
                target: descriptor.id,
                values: diff.added,
              },
            ],
            terms,
          },
          kind: "controlled-list-values-added",
          module: "controlled-list",
          section: descriptor.id,
          status: "proposed",
          summary: `Add ${descriptor.id} terms: ${diff.added.join(", ")}`,
          targets: buildControlledListTargets(repoRoot, descriptor, diff.added, previousVersion, version),
        }),
      );
    }

    if (diff.removed.length) {
      changes.push(
        createChange({
          confidence: "medium",
          evidence: [previousUrl, nextUrl],
          id: `controlled-list-values-removed:${descriptor.id}:${version}`,
          inputs: {
            descriptorId: descriptor.id,
            removedValues: diff.removed,
          },
          kind: "controlled-list-values-removed",
          module: "removal",
          notes: ["Review whether these values should be preserved in historical snapshots and removed only from the new current version."],
          section: descriptor.id,
          status: "manual",
          summary: `Review removed ${descriptor.id} terms: ${diff.removed.join(", ")}`,
          targets: [],
        }),
      );
    }

    if (diff.added.length && diff.removed.length) {
      changes.push(
        createChange({
          confidence: "low",
          evidence: [previousUrl, nextUrl],
          id: `controlled-list-rename-candidate:${descriptor.id}:${version}`,
          inputs: {
            addedValues: diff.added,
            descriptorId: descriptor.id,
            removedValues: diff.removed,
          },
          kind: "controlled-list-rename-candidate",
          module: "rename",
          notes: ["This may be a rename or replacement. Fill in renameTo/replacement fields manually before applying any rename handler."],
          section: descriptor.id,
          status: "manual",
          summary: `Review rename candidates in ${descriptor.id}`,
          targets: [],
        }),
      );
    }
  }

  return { changes, sources: unique(sources) };
}

async function detectSchemaStructureChanges(repoRoot, version, previousVersion, evidenceLoader) {
  const changes = [];
  const metadataPreviousUrl = evidenceLoader.metadataXsdUrl(previousVersion);
  const metadataNextUrl = evidenceLoader.metadataXsdUrl(version);
  const releaseNotesUrl = evidenceLoader.releaseNotesUrl;
  const releaseNotesHtml = await evidenceLoader.get(releaseNotesUrl);
  const { documentationBullets, schemaBullets } = extractReleaseNotesSections(releaseNotesHtml, releaseNotesUrl);
  const metadataDiff = diffNamedXsdItems(
    await evidenceLoader.get(metadataPreviousUrl),
    await evidenceLoader.get(metadataNextUrl),
  );

  const claimedProperties = new Set();

  for (const blueprint of complexStructureBlueprints) {
    const relevant = blueprint.triggerProperties.filter((propertyName) => metadataDiff.elements.added.includes(propertyName));
    if (!relevant.length || !matchBulletText(schemaBullets, blueprint.bulletMatchers)) {
      continue;
    }

    for (const propertyName of relevant) {
      claimedProperties.add(propertyName);
    }

    changes.push(
      createChange({
        confidence: blueprint.confidence,
        evidence: [releaseNotesUrl, metadataPreviousUrl, metadataNextUrl],
        id: `complex-structure-added:${blueprint.id}:${version}`,
        inputs: buildBlueprintInputs(repoRoot, blueprint),
        kind: blueprint.kind,
        module: blueprint.moduleId,
        notes: ["Blueprint-generated from the current repo shape. Review generated files before merge."],
        section: blueprint.id,
        status: "proposed",
        summary: blueprint.summary,
        targets: unique([
          ...blueprint.classFiles.map((className) => path.relative(repoRoot, canonicalClassPath(repoRoot, className))),
          ...blueprint.propertyFiles.map((propertyName) => path.relative(repoRoot, canonicalPropertyPath(repoRoot, propertyName))),
          "context/fullcontext.jsonld",
          releaseMatrixTarget(previousVersion, version),
        ]),
      }),
    );
  }

  for (const blueprint of propertyGroupBlueprints) {
    const relevant = blueprint.triggerProperties.filter((propertyName) => metadataDiff.elements.added.includes(propertyName));
    if (!relevant.length || !matchBulletText(schemaBullets, blueprint.bulletMatchers)) {
      continue;
    }

    for (const propertyName of relevant) {
      claimedProperties.add(propertyName);
    }

    changes.push(
      createChange({
        confidence: blueprint.confidence,
        evidence: [releaseNotesUrl, metadataPreviousUrl, metadataNextUrl],
        id: `property-group-added:${blueprint.id}:${version}`,
        inputs: buildBlueprintInputs(repoRoot, blueprint),
        kind: blueprint.kind,
        module: blueprint.moduleId,
        notes: ["Blueprint-generated from the current repo shape. Review existing shared properties such as schemeURI before merge."],
        section: blueprint.id,
        status: "proposed",
        summary: blueprint.summary,
        targets: unique([
          ...blueprint.propertyFiles.map((propertyName) => path.relative(repoRoot, canonicalPropertyPath(repoRoot, propertyName))),
          "context/fullcontext.jsonld",
          releaseMatrixTarget(previousVersion, version),
        ]),
      }),
    );
  }

  for (const descriptor of Object.values(simplePropertyDescriptors)) {
    const matchingBullets = bulletsForPropertyName(schemaBullets, descriptor.propertyName);
    const wasAdded =
      metadataDiff.elements.added.includes(descriptor.propertyName) ||
      metadataDiff.attributes.added.includes(descriptor.propertyName);
    if (!matchingBullets.length || !wasAdded || claimedProperties.has(descriptor.propertyName)) {
      continue;
    }

    const propertySources = [];
    const definitions = [];

    for (const bullet of matchingBullets) {
      for (const href of bullet.hrefs) {
        if (!/\/properties\//.test(href)) {
          continue;
        }

        const pageHtml = await evidenceLoader.get(href.split("#")[0]);
        const details = extractPropertyDetailsFromHtml(pageHtml, descriptor.propertyName);
        if (details && details.definition) {
          definitions.push(details);
          propertySources.push(href.split("#")[0]);
        }
      }
    }

    const localPropertyPath = canonicalPropertyPath(repoRoot, descriptor.propertyName);
    const propertyFile = readJson(localPropertyPath);
    if (definitions.length) {
      propertyFile["rdfs:comment"] = definitions[0].definition;
    }

    changes.push(
      createChange({
        confidence: "high",
        evidence: unique([releaseNotesUrl, metadataPreviousUrl, metadataNextUrl, ...propertySources]),
        id: `simple-property-added:${descriptor.propertyName}:${version}`,
        inputs: {
          ...buildSimplePropertyInputs(repoRoot, descriptor),
          propertyFile,
        },
        kind: "simple-property-added",
        module: "simple-property",
        section: descriptor.propertyName,
        status: "proposed",
        summary: `Add simple property ${descriptor.propertyName}`,
        targets: [
          path.relative(repoRoot, localPropertyPath),
          "context/fullcontext.jsonld",
          releaseMatrixTarget(previousVersion, version),
        ],
      }),
    );
    claimedProperties.add(descriptor.propertyName);
  }

  for (const propertyName of metadataDiff.elements.added) {
    if (claimedProperties.has(propertyName)) {
      continue;
    }

    changes.push(
      createChange({
        confidence: "low",
        evidence: [releaseNotesUrl, metadataPreviousUrl, metadataNextUrl],
        id: `unmapped-element-added:${propertyName}:${version}`,
        inputs: { propertyName },
        kind: "xsd-element-added",
        module: "property-group",
        notes: ["No matching descriptor or blueprint exists yet for this added schema element."],
        section: propertyName,
        status: "manual",
        summary: `Review unsupported added schema element ${propertyName}`,
        targets: [],
      }),
    );
  }

  for (const propertyName of metadataDiff.elements.removed) {
    changes.push(
      createChange({
        confidence: "medium",
        evidence: [metadataPreviousUrl, metadataNextUrl],
        id: `element-removed:${propertyName}:${version}`,
        inputs: {
          dropFromCurrentContext: false,
          preserveHistoricalFile: true,
          propertyName,
        },
        kind: "xsd-element-removed",
        module: "removal",
        notes: ["Fill in preserveHistoricalFile/dropFromCurrentContext decisions before applying a removal handler."],
        section: propertyName,
        status: "manual",
        summary: `Review removed schema element ${propertyName}`,
        targets: [],
      }),
    );
  }

  for (const attributeName of metadataDiff.attributes.added) {
    if (claimedProperties.has(attributeName)) {
      continue;
    }

    changes.push(
      createChange({
        confidence: "low",
        evidence: [metadataPreviousUrl, metadataNextUrl],
        id: `attribute-added:${attributeName}:${version}`,
        inputs: { attributeName },
        kind: "xsd-attribute-added",
        module: "property-group",
        notes: ["Attribute changes are detected generically and require manual mapping to JSON-LD context or property files."],
        section: attributeName,
        status: "manual",
        summary: `Review added schema attribute ${attributeName}`,
        targets: [],
      }),
    );
  }

  for (const attributeName of metadataDiff.attributes.removed) {
    changes.push(
      createChange({
        confidence: "low",
        evidence: [metadataPreviousUrl, metadataNextUrl],
        id: `attribute-removed:${attributeName}:${version}`,
        inputs: {
          attributeName,
          dropFromCurrentContext: false,
        },
        kind: "xsd-attribute-removed",
        module: "removal",
        notes: ["Attribute removals are manual by default."],
        section: attributeName,
        status: "manual",
        summary: `Review removed schema attribute ${attributeName}`,
        targets: [],
      }),
    );
  }

  for (const groupName of metadataDiff.groups.added) {
    changes.push(
      createChange({
        confidence: "low",
        evidence: [metadataPreviousUrl, metadataNextUrl],
        id: `group-added:${groupName}:${version}`,
        inputs: { groupName },
        kind: "xsd-group-added",
        module: "complex-structure",
        notes: ["Named-group additions may indicate a larger structural change that needs a blueprint."],
        section: groupName,
        status: "manual",
        summary: `Review added named group ${groupName}`,
        targets: [],
      }),
    );
  }

  return {
    changes,
    documentationBullets,
    schemaBullets,
    sources: [metadataPreviousUrl, metadataNextUrl, releaseNotesUrl],
  };
}

async function detectReleaseChanges(repoRoot, version, previousVersion, evidenceLoader) {
  const controlledList = await detectControlledListChanges(repoRoot, version, previousVersion, evidenceLoader);
  const structure = await detectSchemaStructureChanges(repoRoot, version, previousVersion, evidenceLoader);

  return {
    changes: [...controlledList.changes, ...structure.changes],
    documentationBullets: structure.documentationBullets,
    schemaBullets: structure.schemaBullets,
    sources: unique([...controlledList.sources, ...structure.sources]),
  };
}

module.exports = {
  detectReleaseChanges,
  diffNamedXsdItems,
  diffValues,
  extractPropertyDetailsFromHtml,
  extractReleaseNotesSections,
  parseNamedXsdItems,
  parseXsdEnumValues,
};
