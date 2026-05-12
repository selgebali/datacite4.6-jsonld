const { compareVersions, listManifestVersions } = require("../versioning");
const { die, fetchText } = require("./shared");

const releaseHistoryUrl = "https://schema.datacite.org/versions.html";

function parseReleaseDateLabel(label) {
  const monthLookup = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const match = /^\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*$/.exec(String(label));
  if (!match) {
    die(`Could not parse release date from versions page: ${label}`);
  }

  const day = match[1].padStart(2, "0");
  const month = monthLookup[match[2]];
  const year = match[3];

  if (!month) {
    die(`Could not parse release month from versions page: ${label}`);
  }

  return `${year}-${month}-${day}`;
}

function extractOfficialSchema4Releases(html) {
  const startMatch = /<h2[^>]*>\s*DataCite Metadata Schema 4\s*<\/h2>/i.exec(html);
  const endMatch = /<h2[^>]*>\s*Versioning\s*<\/h2>/i.exec(html);

  if (!startMatch || !endMatch || endMatch.index <= startMatch.index) {
    die(`Could not locate the current DataCite 4 release-history section in ${releaseHistoryUrl}`);
  }

  const section = html.slice(startMatch.index, endMatch.index);
  const releases = Array.from(
    section.matchAll(
      /<h3[^>]*>\s*(?:<a[^>]*>)?\s*DataCite Metadata Schema ([0-9.]+)\s*(?:<\/a>)?[\s\S]*?<\/h3>\s*<p[^>]*>\s*Released ([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})\./gi,
    ),
  ).map((match) => ({
    version: match[1],
    releaseDateLabel: match[2],
    releaseDate: parseReleaseDateLabel(match[2]),
  }));

  if (!releases.length) {
    die(`Could not parse any current DataCite 4 releases from ${releaseHistoryUrl}`);
  }

  return releases.sort((a, b) => compareVersions(a.version, b.version));
}

function findOfficialRelease(releases, version) {
  return releases.find((release) => release.version === version) || null;
}

function findPreviousOfficialRelease(releases, version) {
  const lower = releases.filter((release) => compareVersions(release.version, version) < 0);
  return lower.length ? lower[lower.length - 1] : null;
}

async function resolveTargetRelease(repoRoot, requestedVersion, requestedReleaseDate) {
  const localVersions = listManifestVersions(repoRoot);
  const localLatestVersion = localVersions.length ? localVersions[localVersions.length - 1] : null;
  const releaseHistoryHtml = await fetchText(releaseHistoryUrl);
  const officialReleases = extractOfficialSchema4Releases(releaseHistoryHtml);
  const officialVersions = officialReleases.map((release) => release.version);
  const officialLatest = officialReleases[officialReleases.length - 1];
  const nextOfficialRelease = localLatestVersion
    ? officialReleases.find((release) => compareVersions(release.version, localLatestVersion) > 0) || null
    : officialLatest;

  if (!requestedVersion && !nextOfficialRelease) {
    return {
      localLatestVersion,
      localVersions,
      noNewerRelease: true,
      officialLatest,
      officialReleases,
      officialVersions,
      releaseDate: officialLatest.releaseDate,
      targetVersion: officialLatest.version,
    };
  }

  const targetRelease = requestedVersion ? findOfficialRelease(officialReleases, requestedVersion) : nextOfficialRelease;
  if (!targetRelease) {
    die(`Target version ${requestedVersion} was not found in ${releaseHistoryUrl}`);
  }

  const previousOfficialRelease = findPreviousOfficialRelease(officialReleases, targetRelease.version);
  if (previousOfficialRelease) {
    const localPrevious = localVersions.filter((version) => compareVersions(version, targetRelease.version) < 0).pop() || null;
    if (localPrevious !== previousOfficialRelease.version) {
      die(
        `Target version ${targetRelease.version} must be imported sequentially. Official previous release is ${previousOfficialRelease.version}, but the latest lower local version is ${localPrevious || "none"}. Import ${previousOfficialRelease.version} first.`,
      );
    }
  }

  return {
    localLatestVersion,
    localVersions,
    noNewerRelease: false,
    officialLatest,
    officialReleases,
    officialVersions,
    previousOfficialRelease,
    releaseDate: requestedReleaseDate || targetRelease.releaseDate,
    targetRelease,
    targetVersion: targetRelease.version,
  };
}

module.exports = {
  extractOfficialSchema4Releases,
  findOfficialRelease,
  findPreviousOfficialRelease,
  parseReleaseDateLabel,
  releaseHistoryUrl,
  resolveTargetRelease,
};
