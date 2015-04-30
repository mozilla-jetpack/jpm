/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var fs = require("fs-extra");
var path = require("path");
var os = require("os");
var utils = require("../utils");
var settings = require("../../lib/settings");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;

var capitalAddonPath = path.join(__dirname, "..", "fixtures", "Capital-name");

describe("jpm init", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("creates package.json with defaults", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = generateResponses();

    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var manifest = JSON.parse(fs.readFileSync(path.join(utils.tmpOutputDir, "package.json"), "utf-8"));
      expect(manifest.title).to.be.equal("My Jetpack Addon");
      expect(manifest.name).to.be.equal("tmp");
      expect(manifest.version).to.be.equal("0.0.1");
      expect(manifest.description).to.be.equal("A basic add-on");
      expect(manifest.main).to.be.equal("index.js");
      expect(manifest.author).to.be.equal("");
      expect(manifest.engines.firefox).to.be.equal(
        ">=" + settings.MIN_VERSION);
      expect(manifest.engines.fennec).to.be.equal(
        ">=" + settings.MIN_VERSION);
      expect(manifest.license).to.be.equal("MIT");
      done();
    });
  });

  it("creating package.json with folder name containing a capital letter", function (done) {
    var capitalAddonPath = path.join(utils.tmpOutputDir, "Capital-name");
    fs.mkdirSync(capitalAddonPath);

    process.chdir(capitalAddonPath);
    var responses = generateResponses();

    var proc = respond(exec("init", { cwd: capitalAddonPath }), responses);
    proc.on("close", function () {
      var manifest = JSON.parse(fs.readFileSync(path.join(capitalAddonPath, "package.json"), "utf-8"));
      expect(manifest.title).to.be.equal("My Jetpack Addon");
      expect(manifest.name).to.be.equal("capital-name");
      expect(manifest.version).to.be.equal("0.0.1");
      expect(manifest.description).to.be.equal("A basic add-on");
      expect(manifest.main).to.be.equal("index.js");
      done();
    });
  });

  it("creates package.json with custom entries", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = [
      'My Custom Name',
      'my-addon',
      '1.0.0',
      'A description',
      'lib/index.js',
      'Jordan Santell',
      'custom-firefox, nightly-firefox',
      'BSD',
      'yes'
    ];

    var proc = respond(exec("init"), responses.map(function (val) {
      return val + '\n';
    }));
    proc.on("close", function () {
      var manifest = JSON.parse(fs.readFileSync(path.join(utils.tmpOutputDir, "package.json"), "utf-8"));
      expect(manifest.title).to.be.equal(responses[0]);
      expect(manifest.name).to.be.equal(responses[1]);
      expect(manifest.version).to.be.equal(responses[2]);
      expect(manifest.description).to.be.equal(responses[3]);
      expect(manifest.main).to.be.equal(responses[4]);
      expect(manifest.author).to.be.equal(responses[5]);
      expect(manifest.engines['custom-firefox']).to.be.equal(
        ">=" + settings.MIN_VERSION);
      expect(manifest.engines['nightly-firefox']).to.be.equal(
        ">=" + settings.MIN_VERSION);
      expect(manifest.license).to.be.equal(responses[7]);
      done();
    });
  });

  it("sanitizes entries", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = generateResponses();
    responses[1] = "  An invalid $ _ NAMe 123\n";
    responses[2] = "invalid version\n";
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var manifest = JSON.parse(fs.readFileSync(path.join(utils.tmpOutputDir, "package.json"), "utf-8"));
      expect(manifest.name).to.be.equal("aninvalidname123");
      expect(manifest.version).to.be.equal("0.0.0");
      done();
    });
  });

  it("copies in default index.js if it DNE", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = generateResponses();
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var dirIndex = fs.readFileSync(path.join(utils.tmpOutputDir, "index.js"), "utf-8");
      var sourceIndex = fs.readFileSync(path.join("..", "..", "data", "index.js"), "utf-8");
      expect(dirIndex).to.be.equal(sourceIndex);
      done();
    });
  });

  it("does not copy in default index.js if it exists", function (done) {
    process.chdir(utils.tmpOutputDir);
    fs.writeFileSync(path.join(utils.tmpOutputDir, "index.js"), "hello");
    var responses = generateResponses();
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var dirIndex = fs.readFileSync(path.join(utils.tmpOutputDir, "index.js"), "utf-8");
      expect(dirIndex).to.be.equal("hello");
      done();
    });
  });

  it("copies in default README.md if it DNE", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = generateResponses();
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var dirIndex = fs.readFileSync(path.join(utils.tmpOutputDir, "README.md"), "utf-8");
      var defaultContents = "#My Jetpack Addon" + os.EOL + "A basic add-on";
      expect(dirIndex).to.be.equal(defaultContents);
      done();
    });
  });

  it("does not copy in default README.md if it exists", function (done) {
    process.chdir(utils.tmpOutputDir);
    fs.writeFileSync(path.join(utils.tmpOutputDir, "README.md"), "readme!");
    var responses = generateResponses();
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var dirIndex = fs.readFileSync(path.join(utils.tmpOutputDir, "README.md"), "utf-8");
      expect(dirIndex).to.be.equal("readme!");
      done();
    });
  });

  it("copies in default test-index.js if it DNE", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = generateResponses();
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var dirTest = fs.readFileSync(path.join(utils.tmpOutputDir, "test", "test-index.js"), "utf-8");
      var sourceTest = fs.readFileSync(path.join("..", "..", "data", "test-index.js"), "utf-8");
      expect(dirTest).to.be.equal(sourceTest);
      done();
    });
  });

  it("does not copy in default test-index.js if it exists", function (done) {
    process.chdir(utils.tmpOutputDir);
    fs.mkdirpSync(path.join(utils.tmpOutputDir, "test"));
    fs.writeFileSync(path.join(utils.tmpOutputDir, "test", "test-index.js"), "hello");
    var responses = generateResponses();
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var dirTest = fs.readFileSync(path.join(utils.tmpOutputDir, "test", "test-index.js"), "utf-8");
      expect(dirTest).to.be.equal("hello");
      done();
    });
  });

  it("allows non-numeric version strings", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = ["", "", "v0.4.0-rc4", "", "", "", "", "", "yes"];

    var proc = respond(exec("init"), responses.map(function (val) {
      return val + '\n';
    }));
    proc.on("close", function () {
      var manifest = JSON.parse(fs.readFileSync(path.join(utils.tmpOutputDir, "package.json"), "utf-8"));
      expect(manifest.version).to.be.equal("0.4.0-rc4");
      done();
    });
  });

  it("does not create files if not confirmed", function (done) {
    process.chdir(utils.tmpOutputDir);
    fs.mkdirpSync(path.join(utils.tmpOutputDir, "test"));
    var responses = generateResponses();
    responses[responses.length - 1] = "no\n";
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var files = fs.readdirSync(path.join(utils.tmpOutputDir, "test"));
      expect(files.length).to.be.equal(0);
      done();
    });
  });
});

/**
 * Takes a process and array of strings. Everytime stdout emits its
 * data event, the helper writes to stdin in order of the strings array.
 * Also takes an optional function to respond to every stdout `data`
 * event before writing to stdin.
 *
 * @param {Object} proc
 * @param {Array} responses
 * @param {Function} fn
 * @return {Object}
 */
function respond (proc, responses) {
  var count = 0;
  proc.stdout.on("data", function sendResponse (data) {
    proc.stdin.write(responses[count++], "utf-8");

    if (count > responses.length) {
      proc.stdout.off("data", sendResponse);
      proc.stdin.end();
    }
  })

  return proc;
}

// Create 8 empty responses and a "yes"
function generateResponses () {
  var responses = Array(9).join("\n").split("");
  responses.push("yes\n");
  return responses;
}
