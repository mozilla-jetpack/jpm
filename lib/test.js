var extend = require("underscore").extend;
var execute = require("./task");

function test(manifest, options) {
  return execute(manifest, extend(options, { command: "test" }));
}
module.exports = test;
