const { fetchText } = require("./shared");

const docsBase = "https://datacite-metadata-schema.readthedocs.io/en";
const schemaBase = "https://schema.datacite.org/meta";

function metadataXsdUrl(version) {
  return `${schemaBase}/kernel-${version}/metadata.xsd`;
}

function includeXsdUrl(version, filename) {
  return `${schemaBase}/kernel-${version}/include/${filename}`;
}

function releaseNotesUrl(version) {
  return `${docsBase}/${version}/introduction/version-update/`;
}

function docsUrl(version, relativePath) {
  return `${docsBase}/${version}/${relativePath}`;
}

function createEvidenceLoader(version) {
  const cache = new Map();

  async function get(url) {
    if (!cache.has(url)) {
      cache.set(url, await fetchText(url));
    }
    return cache.get(url);
  }

  function resolveDocUrl(href, baseUrl = releaseNotesUrl(version)) {
    return new URL(href, baseUrl).toString();
  }

  return {
    cache,
    docsBase,
    get,
    includeXsdUrl: (xsdVersion, filename) => includeXsdUrl(xsdVersion, filename),
    metadataXsdUrl,
    releaseNotesUrl: releaseNotesUrl(version),
    resolveDocUrl,
    version,
    versionedDocsUrl: (relativePath) => docsUrl(version, relativePath),
  };
}

module.exports = {
  createEvidenceLoader,
  docsUrl,
  includeXsdUrl,
  metadataXsdUrl,
  releaseNotesUrl,
};
