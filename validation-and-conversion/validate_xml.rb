#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative 'lib/bolognese'

# Path to the XML file
xml_file = ARGV[0] || "/Users/selgebali/Documents/VSCode/schema.datacite.org-linked-data/Input files/roundtrip.c14n.xml"

# Read the XML file
xml_content = File.read(xml_file)

# Create a Metadata object from the XML
metadata = Bolognese::Metadata.new(input: xml_content, from: "datacite")

# Check if valid
if metadata.valid?
  puts "✓ XML is valid against DataCite (kernel-4) schema"
  puts "\nValidation: PASSED"
else
  puts "✗ XML validation failed with errors:"
  puts "\n#{metadata.errors}"
  exit 1
end
