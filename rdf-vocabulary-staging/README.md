# DataCite Linked Data Schema (JSON-LD)

This repository contains JSON-LD resources that describe parts of the DataCite metadata schema (version `4.6`) as linked data.

If you are new to this topic:

- JSON-LD is a JSON-based format for representing linked data (RDF-style identifiers and relationships).
- This repo is primarily a collection of schema artifacts, vocabularies, contexts, manifests, and example transformation outputs.

## What This Repository Is For

This repository organizes DataCite metadata concepts into resolvable JSON-LD files:

- `class/` defines major entities such as `Resource`, `Creator`, and `Title`
- `property/` defines metadata properties such as `identifier`, `creatorName`, and `publicationYear`
- `vocab/` defines controlled vocabularies (enumerated terms) used by DataCite fields (for example `resourceTypeGeneral`, `relationType`, `nameType`)
- `context/` contains JSON-LD contexts used to map compact keys to IRIs
- `manifest/` provides a versioned inventory of classes, properties, and vocabulary schemes/terms
- `Input files/` contains example XML, transformed JSON outputs, validation helpers, and notes used during transformation experiments

## Repository Layout (Plain-English Guide)

### `class/`

Each file describes a DataCite entity as a JSON-LD/RDF class.

Example:

- `class/Resource.jsonld` defines the class IRI for a citable resource

Typical structure:

- `@id`: stable IRI of the class
- `@type`: usually `rdf:Class`
- `rdfs:label`: human-readable name
- `rdfs:comment`: short description

### `property/`

Each file describes one DataCite property as a JSON-LD/RDF property.

Example:

- `property/identifier.jsonld` describes the `identifier` field used in DataCite metadata


### `vocab/`

This folder contains controlled terms used by DataCite (enumerations).

Examples:

- `vocab/resourceTypeGeneral/` for values like `Dataset`, `Software`, `Text`
- `vocab/relationType/` for values like `Cites`, `IsPartOf`, `References`
- `vocab/nameType/` for values like `Personal`, `Organizational`

There are usually two kinds of files in each vocabulary folder:

- a vocabulary scheme file (for example `resourceTypeGeneral.jsonld`)
- individual term files (for example `Dataset.jsonld`)

### `context/`

Contains JSON-LD contexts that define how compact JSON keys map to linked-data identifiers.

Important files:

- `context/fullcontext.jsonld`: a large mapping used to interpret DataCite-like JSON as linked data
- `context/runner.jsonld`: example JSON instance using the context
- `context/runner.nq`: RDF/N-Quads output derived from the example
- `context/runner.err`: transformation/processing notes or errors from a run

### `manifest/`

- `manifest/datacite-4.6.json` is a versioned index of the linked-data resources in this repo (classes, properties, vocabulary schemes, and terms)

This is a useful entry point if you want to programmatically discover what is defined for a given schema version.

### `Input files/`

This folder contains working materials and examples used to test conversions and round-tripping:

- DataCite XML examples and XSD files
- XML-shaped JSON examples
- roundtrip XML outputs
- TTL examples
- validation helper script (`validate_xml.rb`)
- notes documenting conversion steps (`codes&steps.md`)

## What Is “Linked Data” Here?

In this repo, linked data mainly means:

- metadata concepts have stable IRIs (web identifiers)
- JSON documents include context mappings (`@context`)
- terms can be interpreted as RDF classes, properties, and controlled concepts

This allows metadata fields like `identifier`, `creator`, or `resourceTypeGeneral` to be described in a machine-readable, interoperable way.

## File Counts (Current Repository Snapshot)

- `class/`: 21 JSON-LD files
- `property/`: 78 JSON-LD files
- `vocab/`: 148 JSON-LD files

## Example: What a Vocabulary Term File Looks Like

An individual vocabulary term (for example `vocab/resourceTypeGeneral/Dataset.jsonld`) includes:

- a stable term IRI
- label (`prefLabel`)
- definition
- scheme membership (`inScheme`)
- optional notes/examples/mappings (`scopeNote`, `example`, `closeMatch`)

## Transformation Notes (XML, JSON, and Purpose)

This repo also includes notes and example artifacts for different transformation approaches from DataCite XML.

Two approaches appear in the existing notes:

1. `XML -> Bolognese JSON` (semantic normalization)
2. `XML -> xml-js JSON` (XML-shaped JSON for structural fidelity / round-trip testing)

The key difference is whether you want semantic convenience or exact XML structure preservation.

### Transformation Purpose Table (Preserved)

| Transformation | Purpose | Reversible | XML fidelity |
| ----- | ----- | ----- | ----- |
| XML -> bolognese JSON | Semantic normalization | ❌ No | ❌ No |
| XML -> xml-js JSON | Structural preservation | ✅ Yes | ✅ Yes |

## When To Use Which Representation

- Use DataCite/Bolognese-style JSON when you want a cleaner application-facing representation for APIs or processing pipelines
- Use XML-shaped JSON when you need to preserve XML attributes/wrappers and support round-trip conversion back to equivalent XML
- Use the JSON-LD files in this repo when you need schema definitions, vocabulary IRIs, and semantic mappings

## Important Context for Newcomers

- DataCite XML and DataCite JSON are not identical representations; they serve different goals
- “Valid XML” and “semantically equivalent JSON” are separate concerns
- JSON-LD contexts do not automatically validate DataCite business rules; they define interpretation/mapping
- Many IRIs in this repo use the `schema.stage.datacite.org` namespace, which indicates a staging environment namespace in the current artifacts

## Suggested Starting Points

If you are exploring this repo for the first time:

1. Read `manifest/datacite-4.6.json` to see the full inventory of defined resources.
2. Open `context/fullcontext.jsonld` to understand how DataCite-like JSON keys are mapped.
3. Compare one file each from `class/`, `property/`, and `vocab/` to see the modeling pattern.
4. Review `Input files/codes&steps.md` and the example files if you are evaluating XML <-> JSON round-tripping.

## Notes
- Some files in `Input files/` are experimental outputs used for validation and comparison, not canonical schema definitions.
