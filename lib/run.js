var extend = require("underscore").extend;
var execute = require("./task");

function run (manifest, options) {
  return execute(manifest, extend(options, { command: "run" }));
}
module.exports = run;
