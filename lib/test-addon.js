/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var _ = require("lodash");
var utils = require("./utils");
var path = require("path");
var fs = require("fs");
var fsPromise = require("fs-promise");
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var exec = require("./exec").exec;
var xpi = require("./xpi");
var test = require("./test");
var when = require("when");

var startPath = process.cwd();
var testPath = path.join(startPath, "test");
var testsPath = path.join(startPath, "tests");
var testsExist = fs.existsSync(testPath) || fs.existsSync(testsPath);

var addonsPath = path.join(startPath, "test-addons")
var addonsExists = fs.existsSync(addonsPath);
var binary = process.env.JPM_FIREFOX_BINARY || "nightly";

var testOptions = require(path.join(startPath, "jpm-test-options.json"))


describe("jpm test", function () {
  process.chdir(startPath);
  if (testsExist) {
    it("Running Jetpack tests", function (done) {
      utils.getManifest().then(function(manifest) {
        console.log(JSON.stringify(testOptions))
        test(manifest, testOptions).then(function(results) {
          expect(results.code).to.be.equal(0);
          done();
        })
      })
    });
  }
});

describe("jpm test add-ons", function () {
  if (!addonsExists) {
    return null;
  }

  fs.readdirSync(addonsPath)
  .filter(fileFilter)
  .forEach(function (file) {
    it(file, function (done) {
      var addonXPIPath = "";
      var helperXPIPath = "";
      var testAddonXPIPath = "";
      var helperPath = path.join(__dirname, "../test-helper");
      var testAddonPath = path.join(addonsPath, file);


      process.chdir(startPath);
      return utils.getManifest().then(function(manifest) {
        return xpi(manifest);
      })
      .then(function(xpiPath) {
        addonXPIPath = xpiPath;
      })
      .then(function() {
        process.chdir(testAddonPath);
        return utils.getManifest().then(function(manifest) {
          return xpi(manifest);
        });
      })
      .then(function(xpiPath) {
        testAddonXPIPath = xpiPath;
        console.log("Created " + testAddonXPIPath)
        var helperAddonPath = path.join(__dirname, "../test-helper/data/test-addon.xpi");
        console.log("Moving " + testAddonXPIPath + " to " + helperAddonPath)

        return fsPromise.rename(testAddonXPIPath, helperAddonPath);
      })
      .then(function() {
        console.log("Move is complete")
        process.chdir(helperPath);
        return utils.getManifest().then(function(manifest) {
          testOptions.xpis = [ addonXPIPath ];
          delete testOptions.prefs;

          return when.promise(function(resolve) {
            var proc = exec("run -v", {
              cwd: helperPath,
              env: _.extend(process.env, { NODE_ENV: "test" })
            }, function (err, stdout, stderr) {
              console.log(stdout)
              expect(stdout).to.contain("All tests passed");
              process.chdir(startPath);
              resolve();
            });
          }).then(done)
        })
      })
    });
  });
});

function fileFilter(file) {
  var stat = fs.statSync(path.join(addonsPath, file))
  return (stat && stat.isDirectory());
}
