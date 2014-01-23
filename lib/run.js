var _ = require("underscore");
var xpi = require("./xpi");
var createProfile = require("./profile");
var runFirefox = require("./firefox");
var console = require("./utils").console;

function run (manifest, options) {
  // Generate XPI and get the path
  return xpi(manifest, options).then(function (xpiPath) {
    return runFirefox(_.extend({}, options, {
      xpi: xpiPath
    }));
  });
}
module.exports = run;
