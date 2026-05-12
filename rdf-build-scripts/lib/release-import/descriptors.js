const path = require("path");
const { lowercaseInitial } = require("./shared");

function normalizeSimpleSectionId(term) {
  return String(term).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeRelationTypeSectionId(term) {
  return `relationtype-${normalizeSimpleSectionId(term)}`;
}

const controlledListDescriptors = [
  {
    id: "resourceTypeGeneral",
    vocabName: "resourceTypeGeneral",
    xsdIncludeFile: "datacite-resourceType-v4.xsd",
    appendixPath: "appendices/appendix-1/resourceTypeGeneral/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Description", "Definition"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Examples and Usage Notes", "Example and Usage Notes", "Notes"],
      exampleLabels: ["Examples and Usage Notes", "Example and Usage Notes", "Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "relatedIdentifierType",
    vocabName: "relatedIdentifierType",
    xsdIncludeFile: "datacite-relatedIdentifierType-v4.xsd",
    appendixPath: "appendices/appendix-1/relatedIdentifierType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Description", "Definition"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Description", "Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: true,
    },
  },
  {
    id: "relationType",
    vocabName: "relationType",
    xsdIncludeFile: "datacite-relationType-v4.xsd",
    appendixPath: "appendices/appendix-1/relationType/",
    sectionId: normalizeRelationTypeSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Example and Usage Notes", "Examples and Usage Notes", "Notes"],
      exampleLabels: ["Example and Usage Notes", "Examples and Usage Notes", "Example", "Examples"],
      definitionTransform: (value) => lowercaseInitial(String(value).replace(/\.$/, "")),
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "contributorType",
    vocabName: "contributorType",
    xsdIncludeFile: "datacite-contributorType-v4.xsd",
    appendixPath: "appendices/appendix-1/contributorType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples", "Example and Usage Notes", "Examples and Usage Notes"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "dateType",
    vocabName: "dateType",
    xsdIncludeFile: "datacite-dateType-v4.xsd",
    appendixPath: "appendices/appendix-1/dateType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "descriptionType",
    vocabName: "descriptionType",
    xsdIncludeFile: "datacite-descriptionType-v4.xsd",
    appendixPath: "appendices/appendix-1/descriptionType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "funderIdentifierType",
    vocabName: "funderIdentifierType",
    xsdIncludeFile: "datacite-funderIdentifierType-v4.xsd",
    appendixPath: "appendices/appendix-1/funderIdentifierType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "nameType",
    vocabName: "nameType",
    xsdIncludeFile: "datacite-nameType-v4.xsd",
    appendixPath: "appendices/appendix-1/nameType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "numberType",
    vocabName: "numberType",
    xsdIncludeFile: "datacite-numberType-v4.xsd",
    appendixPath: "appendices/appendix-1/numberType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
  {
    id: "titleType",
    vocabName: "titleType",
    xsdIncludeFile: "datacite-titleType-v4.xsd",
    appendixPath: "appendices/appendix-1/titleType/",
    sectionId: normalizeSimpleSectionId,
    fieldProfile: {
      definitionLabels: ["Definition", "Description"],
      altLabelLabels: ["Full Name"],
      notesLabels: ["Notes", "Example and Usage Notes", "Examples and Usage Notes"],
      exampleLabels: ["Example", "Examples"],
      definitionTransform: null,
      useDefinitionParagraphsAsScopeNote: false,
    },
  },
];

const controlledListDescriptorMap = new Map(controlledListDescriptors.map((descriptor) => [descriptor.id, descriptor]));

const simplePropertyDescriptors = {
  classificationCode: {
    id: "classificationCode",
    propertyName: "classificationCode",
    contextKeys: ["classificationCode"],
    releaseMatrixChanges: [{ kind: "sub-property-added", target: "subject", property: "classificationCode" }],
    bulletMatchers: [/classificationCode/i, /\bSubject\b/i],
  },
  dateInformation: {
    id: "dateInformation",
    propertyName: "dateInformation",
    contextKeys: ["dateInformation"],
    releaseMatrixChanges: [{ kind: "sub-property-added", target: "date", property: "dateInformation" }],
    bulletMatchers: [/dateInformation/i, /\bDate\b/i],
  },
  relationTypeInformation: {
    id: "relationTypeInformation",
    propertyName: "relationTypeInformation",
    contextKeys: ["relationTypeInformation"],
    releaseMatrixChanges: [
      { kind: "sub-property-added", target: "relatedIdentifier", property: "relationTypeInformation", occurrences: "0-1" },
      { kind: "sub-property-added", target: "relatedItem", property: "relationTypeInformation", occurrences: "0-1" },
    ],
    bulletMatchers: [/relationTypeInformation/i],
  },
};

const propertyGroupBlueprints = [
  {
    id: "publisher-subproperties",
    moduleId: "property-group",
    kind: "property-group-added",
    summary: "Add Publisher subproperties",
    bulletMatchers: [/\bPublisher property\b/i, /\bPublisher\b/i],
    triggerProperties: ["publisherIdentifier", "publisherIdentifierScheme", "schemeURI"],
    propertyFiles: ["publisherIdentifier", "publisherIdentifierScheme", "schemeURI"],
    contextKeys: ["publisherIdentifier", "publisherIdentifierScheme", "schemeURI"],
    releaseMatrixChanges: [
      {
        kind: "property-group-added",
        target: "publisher",
        properties: ["publisherIdentifier", "publisherIdentifierScheme", "schemeURI"],
      },
    ],
    confidence: "medium",
  },
  {
    id: "rights-subproperties",
    moduleId: "property-group",
    kind: "property-group-added",
    summary: "Add Rights subproperties",
    bulletMatchers: [/\bRights\b/i],
    triggerProperties: ["rightsIdentifier", "rightsIdentifierScheme", "schemeURI"],
    propertyFiles: ["rightsIdentifier", "rightsIdentifierScheme", "schemeURI"],
    contextKeys: ["rightsIdentifier", "rightsIdentifierScheme", "schemeURI"],
    releaseMatrixChanges: [
      {
        kind: "property-group-added",
        target: "rights",
        properties: ["rightsIdentifier", "rightsIdentifierScheme", "schemeURI"],
      },
    ],
    confidence: "medium",
  },
];

const complexStructureBlueprints = [
  {
    id: "FundingReference",
    moduleId: "complex-structure",
    kind: "complex-structure-added",
    summary: "Add FundingReference structure",
    bulletMatchers: [/FundingReference/i, /\bfunding\b/i],
    triggerProperties: ["fundingReference", "funderName", "funderIdentifier", "funderIdentifierType", "awardNumber", "awardURI", "awardTitle"],
    classFiles: ["FundingReference"],
    propertyFiles: ["fundingReference", "funderName", "funderIdentifier", "funderIdentifierType", "awardNumber", "awardURI", "awardTitle"],
    contextKeys: [
      "fundingReferences",
      "fundingReference",
      "funderName",
      "funderIdentifier",
      "funderIdentifierType",
      "awardNumber",
      "awardURI",
      "awardTitle",
    ],
    releaseMatrixChanges: [
      {
        kind: "complex-structure-added",
        target: "fundingReference",
        classes: ["FundingReference"],
        properties: ["fundingReference", "funderName", "funderIdentifier", "funderIdentifierType", "awardNumber", "awardURI", "awardTitle"],
      },
    ],
    confidence: "medium",
  },
  {
    id: "RelatedItem",
    moduleId: "complex-structure",
    kind: "complex-structure-added",
    summary: "Add RelatedItem structure",
    bulletMatchers: [/RelatedItem/i, /relatedItem/i],
    triggerProperties: [
      "relatedItem",
      "relatedItemType",
      "relatedItemIdentifier",
      "relatedItemIdentifierType",
      "volume",
      "issue",
      "number",
      "numberType",
      "firstPage",
      "lastPage",
      "edition",
    ],
    classFiles: ["RelatedItem"],
    propertyFiles: [
      "relatedItem",
      "relatedItemType",
      "relatedItemIdentifier",
      "relatedItemIdentifierType",
      "volume",
      "issue",
      "number",
      "numberType",
      "firstPage",
      "lastPage",
      "edition",
    ],
    contextKeys: [
      "relatedItems",
      "relatedItem",
      "relatedItemType",
      "relatedItemIdentifier",
      "relatedItemIdentifierType",
      "volume",
      "issue",
      "number",
      "numberType",
      "firstPage",
      "lastPage",
      "edition",
    ],
    releaseMatrixChanges: [
      {
        kind: "complex-structure-added",
        target: "relatedItem",
        classes: ["RelatedItem"],
        properties: [
          "relatedItem",
          "relatedItemType",
          "relatedItemIdentifier",
          "relatedItemIdentifierType",
          "volume",
          "issue",
          "number",
          "numberType",
          "firstPage",
          "lastPage",
          "edition",
        ],
      },
    ],
    confidence: "medium",
  },
];

function canonicalPropertyPath(repoRoot, propertyName) {
  return path.join(repoRoot, "property", `${propertyName}.jsonld`);
}

function canonicalClassPath(repoRoot, className) {
  return path.join(repoRoot, "class", `${className}.jsonld`);
}

function canonicalSchemePath(repoRoot, vocabName) {
  return path.join(repoRoot, "vocab", vocabName, `${vocabName}.jsonld`);
}

function canonicalConceptPath(repoRoot, vocabName, termName) {
  return path.join(repoRoot, "vocab", vocabName, `${termName}.jsonld`);
}

module.exports = {
  canonicalClassPath,
  canonicalConceptPath,
  canonicalPropertyPath,
  canonicalSchemePath,
  complexStructureBlueprints,
  controlledListDescriptorMap,
  controlledListDescriptors,
  normalizeRelationTypeSectionId,
  normalizeSimpleSectionId,
  propertyGroupBlueprints,
  simplePropertyDescriptors,
};
