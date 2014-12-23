/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var utils = require("../utils");
var path = require("path");
var fs = require("fs");
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var exec = utils.exec;

var addonsPath = path.join(__dirname, "..", "addon_runners");
var binary = process.env.JPM_FIREFOX_BINARY || "nightly";

describe("jpm run addons", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  fs.readdirSync(addonsPath)
  .filter(fileFilter)
  .forEach(function (file) {
    it(file, function (done) {
      var addonPath = path.join(addonsPath, file);
      process.chdir(addonPath);

      var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
      if (process.env.DISPLAY) {
        options.env.DISPLAY = process.env.DISPLAY;
      }
      var proc = exec("run", options, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("All tests passed!");
        expect(stdout).to.not.contain("There were test failures.");
        expect(stdout).to.not.contain("No tests were run");
        done();
      });
    });
  });
});

function fileFilter(file) {
  var stat = fs.statSync(path.join(addonsPath, file))
  return (stat && stat.isDirectory());
}
