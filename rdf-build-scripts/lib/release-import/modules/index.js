const controlledList = require("./controlled-list");
const simpleProperty = require("./simple-property");
const propertyGroup = require("./property-group");
const complexStructure = require("./complex-structure");
const rename = require("./rename");
const removal = require("./removal");

const modules = [controlledList, simpleProperty, propertyGroup, complexStructure, rename, removal];

function moduleById(moduleId) {
  return modules.find((entry) => entry.moduleId === moduleId) || null;
}

module.exports = {
  moduleById,
  modules,
};
