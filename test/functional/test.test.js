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

function allTestPasses(stdout) {
  var matches = stdout.match(/(\d)* of (\d)* tests passed./m);
  if (!matches) {
    return false;
  }
  return matches[1] === matches[2];
}

function oneTestFails(stdout) {
  var matches = stdout.match(/(\d)* of (\d)* tests passed./m);
  if (!matches) {
    return false;
  }
  return parseInt(matches[1]) === parseInt(matches[2]) - 1;
}

describe("jpm test", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("test-success", function (done) {
    var addonPath = path.join(addonsPath, "test-success");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test", options, function (err, stdout, stderr) {
      expect(allTestPasses(stdout)).to.equal(true);
      expect(stdout).to.contain("All tests passed!");
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(0);
    });
  });

  it("test-success with verbose", function (done) {
    var addonPath = path.join(addonsPath, "test-success");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test -v", options, function (err, stdout, stderr) {
      expect(allTestPasses(stdout)).to.equal(true);
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
    var proc = exec("test", options, function (err, stdout, stderr) {
      expect(oneTestFails(stdout)).to.equal(true);
      expect(stdout).to.not.contain("All tests passed!");
      expect(stdout).to.contain("There were test failures...");
      expect(stdout).to.not.contain("test-failure.testFailure: failure");
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(1);
    });
  });

  it("test-failure with verbose", function (done) {
    var addonPath = path.join(addonsPath, "test-failure");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test -v", options, function (err, stdout, stderr) {
      expect(oneTestFails(stdout)).to.equal(true);
      expect(stdout).to.not.contain("All tests passed!");
      expect(stdout).to.contain("There were test failures...");
      expect(stdout).to.contain("The following tests failed:");
      expect(stdout).to.contain("test-failure.testFailure: failure");
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(1);
    });
  });

  it("test-logging-german-char", function (done) {
    var addonPath = path.join(addonsPath, "test-logging-german-char");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test -v", options, function (err, stdout, stderr) {
      expect(allTestPasses(stdout)).to.equal(true);
      expect(stdout).to.contain("All tests passed!");
      expect(stdout).to.contain("ü");
      done();
    });
    proc.once("exit", function(code) {
      expect(code).to.equal(0);
    });
  });
});
