# DataCite 4.6 Context File Alignment Analysis

## Summary

This document outlines the review and alignment of the DataCite 4.6 JSON-LD context file (`datacite_api.jsonld`) with the JSON API example (`datacite_example_filledin.json`).

---

## Phase 1: IRI Map Updates ✅ COMPLETED

### Changes Made

All `iriMap` URLs in the `$defs` section have been updated from:
- **Old Format:** `https://selgebali.github.io/datacite4.6-jsonld/datacite4.6-profile.json#enums/{enumType}/{value}`
- **New Format:** `https://schema.datacite.org/vocab/datacite-4.6/{enumType}/{value}`

### Enumerations Updated
1. **resourceTypeGeneral** - 31 values (Audiovisual, Award, Book, ... Text, Workflow, Other)
2. **descriptionType** - 6 values (Abstract, Methods, SeriesInformation, TableOfContents, TechnicalInfo, Other)
3. **contributorType** - 21 values (ContactPerson through WorkPackageLeader)
4. **dateType** - 12 values (Accepted through Withdrawn)
5. **nameType** - 2 values (Personal, Organizational)
6. **relatedIdentifierType** - 20 values (ARK through w3id)
7. **relationType** - 38 values (IsCitedBy through IsTranslationOf)
8. **funderIdentifierType** - 5 values (ISNI, GRID, ROR, Crossref Funder ID, Other)
9. **titleType** - 4 values (AlternativeTitle, Subtitle, TranslatedTitle, Other)

**Total: 139 IRI mappings updated**

---

## Phase 2: Context vs API Example Comparison

### Current Context Structure (`datacite_api.jsonld`)

The context file contains two main sections:

#### 1. **@context Definition (Root Level)**
```
- @version: 1.2
- @base: "https://schema.datacite.org/"
- Namespace Prefixes:
  - datacite: "https://schema.datacite.org/"
  - dc: "https://schema.datacite.org/"
  - Class: "https://schema.datacite.org/class/"
  - Property: "https://schema.datacite.org/property/"
  - Vocab: "https://schema.datacite.org/vocab/datacite-4.6/"
```

#### 2. **profile.@context** (Nested)
- Version: 1.1
- External vocabularies: schema.org, DCAT, SKOS, XSD
- 100+ property mappings with semantic URIs and type definitions

### API Example Structure (`datacite_example_filledin.json`)

The example represents a JSON API response with a `data.attributes` structure containing:

**Top-level attributes:**
- Identifiers (doi, identifiers, alternateIdentifiers)
- Creators (with nested affiliation & nameIdentifiers)
- Titles (with titleType)
- Publisher (with publisherIdentifier, publisherIdentifierScheme)
- PublicationYear
- Subjects (with classificationCode support)
- Contributors (with 21 types)
- Dates (12 dateType values)
- Language
- Types (ris, bibtex, citeproc, schemaOrg, resourceType, resourceTypeGeneral)
- RelatedIdentifiers (36 entries with relationType & resourceTypeGeneral)
- RelatedItems (with nested structure)
- Sizes & Formats
- Version
- RightsList
- Descriptions
- GeoLocations
- FundingReferences
- XML (base64-encoded)

---

## Phase 3: Alignment Issues & Recommendations

### ✅ ALIGNED - Currently Working Well

1. **Enumeration Coverage**
   - All enum types from the API example are defined in the context
   - iriMaps are now at schema.datacite.org/vocab/datacite-4.6

2. **Property Mappings**
   - Core properties are semantically mapped
   - Language tags are handled
   - Container types (@list) are properly defined

3. **Type System**
   - String types (xsd:string)
   - Language types (xsd:language)
   - URI types (@id, @type: "@id")

### ⚠️ NEEDS ATTENTION

#### 1. **Missing: container.@context**
   - The `container` property has complex nested structure
   - Needs explicit @context for: type, title, identifier, identifierType

   **Example from API:**
   ```json
   "container": {
     "type": "DataRepository",
     "title": "Example SeriesInformation",
     "identifier": "http://purl.oclc.org/foo/bar",
     "identifierType": "PURL"
   }
   ```

   **Action:** Add container context mapping to property definitions

#### 2. **Missing: publisher Structure**
   - Current mapping: `"publisher": { "@id": "datacite:publisher" }`
   - Actual structure includes: name, schemeUri, publisherIdentifier, publisherIdentifierScheme

   **Action:** Expand publisher to handle object with multiple properties

#### 3. **Missing: types Object Mapping**
   - Current context lacks mapping for the `types` object sub-properties
   - Properties: ris, bibtex, citeproc, schemaOrg, resourceType, resourceTypeGeneral
   - These are currently plain strings

   **Action:** Define @context mapping for each type category

#### 4. **Missing: geoLocationPoint & geoLocationBox Details**
   - `geoLocationPoint` has: pointLatitude, pointLongitude
   - `geoLocationBox` has: westBoundLongitude, eastBoundLongitude, southBoundLatitude, northBoundLatitude
   - Both need numeric type definitions (xsd:decimal or xsd:double)

   **Action:** Add precise type annotations for geo coordinates

#### 5. **Missing: polygon Structure**
   - `geoLocationPolygon` contains array of `polygonPoint` items
   - Each `polygonPoint` contains `inPolygonPoint` with lat/lon
   - Current context treats as @list but lacks nested context

   **Action:** Define nested contexts for polygon geometry

#### 6. **Missing: affiliation Array Handling**
   - Affiliation can be a simple string OR object with: name, schemeUri, affiliationIdentifier, affiliationIdentifierScheme
   - Current context doesn't handle both cases

   **Action:** Add object context for complex affiliation structure

#### 7. **Missing: nameIdentifier IRI Distinction**
   - `nameIdentifiers` array includes schemeUri within each element
   - Should reference external URI schemes (ORCID, etc.)

   **Action:** Clarify if nameIdentifier should be treated as @id

#### 8. **Missing: relatedItem Sub-Context**
   - `relatedItems` contain: relatedItemIdentifier, relatedItemIdentifierType, relationType, and other properties
   - Needs complete sub-context definition

   **Action:** Define complete context for relatedItem properties

#### 9. **Language Tag Handling Inconsistency**
   - JSON API example uses `lang` property as sibling to text properties
   - Not currently mapped in context
   - Note in context mentions this is for API compatibility

   **Action:** Add lang property mapping in context

#### 10. **Missing: numberType Enum**
   - Used in relatedItems but not listed as enumeration in $defs
   - Example value: "Other"

   **Action:** Define numberType enumeration

---

## Phase 4: Required Actions - Priority Order

### 🔴 CRITICAL (Blocking semantic export)

- [x] **Add container sub-context** - Required for container objects in relatedItems
- [x] **Add publisher object context** - Multiple properties in actual data
- [x] **Fix geoLocation coordinates** - Need numeric type definitions
- [ ] **Add relatedItem context** - Core feature of DataCite 4.6
- [x] **Add numberType enumeration** - Missing from $defs - Review

### 🟠 HIGH (Affecting data quality)

- [ ] **Expand types object mapping** - Currently lacks sub-property context
- [x] **Handle complex affiliation** - Can be string or object
- [x] **Add polygon geometry context** - Complete structure needed
- [ ] **Clarify nameIdentifier mapping** - Should validate against external schemes
- [x] **Add lang property mapping** - Currently undocumented

### 🟡 MEDIUM (Best practices)

- [ ] **Document all enumerations** - Add comments explaining each enum - not needed
- [ ] **Add profile/base context comment** - Explain context hierarchy
- [ ] **Define cardinality constraints** - Which properties are required/optional
- [ ] **Add validation examples** - Show expected @context expansion
- [ ] **Create separate enum context** - Consider extracting $defs to separate file

### 🟢 LOW (Nice to have)

- [ ] **Add deprecated properties** - Document any legacy items
- [ ] **Add inverse property mappings** - For graph relationships
- [ ] **Create context version history** - Track changes
- [ ] **Add SHACL shapes** - For structural validation

---

## Recommended Next Steps

### Immediate (1-2 days)
1. Create new section for complex object contexts (container, publisher, types, affiliation)
2. Add geoLocation coordinate type definitions
3. Add numberType and any missing enumerations
4. Add relatedItem complete context mapping

### Short-term (1 week)
1. Test context against full datacite_example_filledin.json
2. Verify @context expansion produces valid semantic URIs
3. Document all property mappings with examples
4. Create validation test suite

### Medium-term (2-4 weeks)
1. Align with official DataCite ontology if available
2. Consider DCAT, Schema.org, and other standard alignments
3. Create multiple context variants (minimal, full, with-validation)
4. Deploy to schema.datacite.org with versioning

---

## File References

- **Context File:** `NameSpaceArtefacts/schema.datacite.org/context/datacite_api.jsonld`
- **Example File:** `datacite_example_filledin.json`
- **Profile Location:** `docs/datacite4.6-profile.json`
- **Enum Lists:** `docs/enum_lists/datacite4.6-schema.json`

---

## IRI Map Update Verification

**Updated from:**
```
https://selgebali.github.io/datacite4.6-jsonld/datacite4.6-profile.json#enums/{type}/{value}
```

**Updated to:**
```
https://schema.datacite.org/vocab/datacite-4.6/{type}/{value}
```

**Example transformation:**
- Old: `https://selgebali.github.io/datacite4.6-jsonld/datacite4.6-profile.json#enums/resourceTypeGeneral/Dataset`
- New: `https://schema.datacite.org/vocab/datacite-4.6/resourceTypeGeneral/Dataset`

✅ **All 139 iriMap entries successfully updated**

---

**Document Generated:** January 20, 2026
**Status:** Analysis Complete | Updates Pending Implementation
