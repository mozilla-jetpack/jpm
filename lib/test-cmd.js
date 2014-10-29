/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var path = require("path");
var Mocha = require("mocha");
var fs = require("fs-promise");
var optionsPath = path.join(process.cwd(), "jpm-test-options.json");
var OPTIONS = [
  
]

function run(manifest, program) {
  var cleanOptions = true;
  var options = {
    binary: program.binary,
    profile: program.profile,
    verbose: program.verbose,
    overload: program.overload,
    filter: program.filter,
    prefs: program.prefs,
    "stop-on-error": program["stop-on-error"],
    tbpl: program.tbpl,
    times: program.times,
    "check-memory": program["check-memory"],
    "profile-memory": program["profile-memory"],
    retro: program.retro
  };
  var data = JSON.stringify(options, null, 2) + "\n";
  var mocha = new Mocha({
    ui: "bdd",
    reporter: "spec",
    timeout: 50000
  });

  process.env.NODE_ENV = "test";
  var testFilePath = path.join(__dirname, "test-addon.js");
  console.log("testFilePath " + testFilePath)
  mocha.addFile(testFilePath);

  fs.exists(optionsPath)
  .then(function(exists) {
    if (exists) {
      cleanOptions = false;
      return null;
    }
    console.log("Writing to "+optionsPath);
    console.log(data);
    return fs.writeFile(optionsPath, data, "utf-8");
  })
  .then(function startTests() {
    console.log("Wrote to "+optionsPath);
    try {
      mocha.run(function (failures) {
        console.log("Done with tests");
        if (cleanOptions) {
          return fs.unlink(optionsPath).then(function() {
            if (!failures) {
              console.log("All tests passed");
            }
            process.exit(failures);
          });
        }
        process.exit(failures);
      });
    }
    catch(e) {
      console.log(e)
    }
  })
  .catch(console.exception)
}
exports.run = run;
