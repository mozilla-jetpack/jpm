/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var utils = require("./utils");
var path = require("path");
var fs = require("fs");
var fsPromise = require("fs-promise");
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var exec = utils.exec;
var test = require("./test");
var xpi = require("./xpi");

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
      var addonPath = path.join(addonsPath, file);
      process.chdir(addonPath);

      return utils.getManifest().then(function(manifest) {
        return xpi(manifest);
      }).
      then(function(xpiPath) {
        var helperPath = path.join(__dirname, "../test-helper");
        var helperAddonPath = path.join(__dirname, "../test-helper/data/test-addon.xpi");
        var helperXPIPath = "";
        return fsPromise.rename(xpiPath, helperAddonPath).then(function() {
          process.chdir(helperPath);
          return xpi(helperPath);
        })
        .then(function(xpiPath) {
          helperXPIPath = xpiPath;
          return fs.unlink(helperAddonPath);
        })
        .then(function() {
          return helperXPIPath;
        });
      })
      .then(function(xpiPath) {
        process.chdir(startPath);
        test(manifest, testOptions, [ xpiPath ]).then(function(results) {
          expect(results.code).to.be.equal(0);

          done();
        })
      })
    });
  });
});

function fileFilter(file) {
  var stat = fs.statSync(path.join(addonsPath, file))
  return (stat && stat.isDirectory());
}
