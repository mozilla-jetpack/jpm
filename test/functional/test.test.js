/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var utils = require("../utils");
var path = require("path");
var exec = utils.exec;
var chai = require("chai");
var expect = chai.expect;
var when = require("when");

var addonsPath = path.join(__dirname, "..", "fixtures");

var binary = process.env.JPM_FIREFOX_BINARY || "nightly";
/*
describe("jpm test", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("test-success", function (done) {
    var addonPath = path.join(addonsPath, "test-success");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test -v", options, function (err, stdout, stderr) {
      expect(stdout).to.contain("2 of 2 tests passed.");
      expect(stdout).to.contain("All tests passed!");
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(0);
    });
  });

  it("test-failure", function (done) {
    var addonPath = path.join(addonsPath, "test-failure");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test -v", options, function (err, stdout, stderr) {
      process.stdout.write(stdout)
      process.stdout.write(stderrr)
      expect(stdout).to.contain("1 of 2 tests passed.");
      expect(stdout).to.not.contain("All tests passed!");
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(1);
    });
  });
});
*/
