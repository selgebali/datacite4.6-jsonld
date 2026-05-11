1- Create the XML-shaped JSON:
Input xml file from: https://schema.datacite.org/meta/kernel-4.6/example/datacite-example-full-v4.xml 

    xml-js "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/datacite-example-full-v4.xml" \
    --to-json \
    --compact true \
    --spaces 2 \
    --no-comment \
    --no-decl \
    --attributes-key "attrs" \
    --text-key "value" \  "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/XML-Shaped-JSON.json"

  ---

  2- Convert back to XML:
  
    xml-js "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/XML-Shaped-JSON.json" \
    --to-xml \
    --compact true \
    --spaces 2 \
    --attributes-key "attrs" \
    --text-key "value" \  "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/roundtrip.xml"

  ---
3- Canonicalize both XML files and diff (removes whitespace noise):

    xmllint --c14n \
    "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/datacite-example-full-v4.xml" \  "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/original.c14n.xml"
--

    xmllint --c14n \
    "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/roundtrip.xml" \ "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/roundtrip.c14n.xml"
--

Beautify orginal.c14n.xml and roundtrip.c14.xml using online tool : https://jsonformatter.org/xml-formatter 
compare the two files using: https://codebeautify.org/xml-diff
0 changes found.

----

Using the roundtrip.c14.xml to validate against XSD using bolognese see code used validate_xml.rb. Result = ✓ XML is valid against DataCite (kernel-4) schema

Summary: XML --> JSON --> XML = valid against XSD. XML-Shaped-JSON.json is a JSON instance file based on an XML that passes the XSD requirements, using that JSON instance should be able to register a DOI. 

----
XML-Shaped-JSON.json :
@attrs = XML attributes (like <element attribute="value">)
Direct properties = XML child elements
@value = XML element text content

Pattern 1: Simple property with attributes and value
"identifier": {
  "@attrs": {
    "identifierType": "DOI"
  },
  "@value": "10.82433/B09Z-4K37"
}
This represents: <identifier identifierType="DOI">10.82433/B09Z-4K37</identifier>

Pattern 2: Array of items
"creators": {
  "creator": [
    { "creatorName": {...} },
    { "creatorName": {...} }
  ]
}
Represents multiple <creator> elements within <creators>

Pattern 3: Nested objects with attributes
"affiliation": {
  "@attrs": {
    "affiliationIdentifier": "https://ror.org/04wxnsj81",
    "affiliationIdentifierScheme": "ROR",
    "schemeURI": "https://ror.org"
  },
  "@value": "ExampleAffiliation"
}
----
// Get the DOI
const doi = data.resource.identifier["@value"];  
// Result: "10.82433/B09Z-4K37"

// Get first creator's name
const creatorName = data.resource.creators.creator[0].creatorName["@value"];
// Result: "ExampleFamilyName, ExampleGivenName"

// Get publisher info
const publisher = data.resource.publisher["@value"];
// Result: "Example Publisher"
