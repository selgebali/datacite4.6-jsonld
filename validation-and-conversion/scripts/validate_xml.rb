#!/usr/bin/env ruby
# frozen_string_literal: true

require 'nokogiri'
require 'pathname'
require 'optparse'

DEFAULT_XSD = Pathname.new(__dir__).join('..', 'schemas', 'xsd', 'metadata-4.6.xsd').expand_path.to_s

options = { xsd: DEFAULT_XSD }
OptionParser.new do |opts|
  opts.banner = "Usage: validate_xml.rb [--xsd <path>] <xml-file>"
  opts.on('--xsd PATH', "XSD schema path (default: #{DEFAULT_XSD})") { |p| options[:xsd] = p }
end.parse!

xml_path = ARGV[0]
abort "Usage: validate_xml.rb [--xsd <path>] <xml-file>" if xml_path.nil?
abort "XSD not found: #{options[:xsd]}" unless File.exist?(options[:xsd])
abort "XML not found: #{xml_path}" unless File.exist?(xml_path)

# Load the schema with its directory as cwd so <xs:include> can resolve sibling files.
xsd_path = File.expand_path(options[:xsd])
xsd = Dir.chdir(File.dirname(xsd_path)) do
  Nokogiri::XML::Schema(File.read(File.basename(xsd_path)))
end
doc = Nokogiri::XML(File.read(xml_path))
errors = xsd.validate(doc)

if errors.empty?
  puts "OK: #{xml_path} validates against #{File.basename(options[:xsd])}"
  exit 0
else
  warn "Validation FAILED (#{errors.size} error(s)):"
  errors.each { |e| warn "  - #{e}" }
  exit 1
end
