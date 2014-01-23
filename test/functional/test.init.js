var fs = require("fs");
var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;

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
      expect(manifest.version).to.be.equal("0.0.0");
      expect(manifest.description).to.be.equal("");
      expect(manifest.main).to.be.equal("index.js");
      expect(manifest.author).to.be.equal("");
      expect(manifest.engines.firefox).to.be.equal("*");
      expect(manifest.engines.fennec).to.be.equal("*");
      expect(manifest.license).to.be.equal("MIT");
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
      expect(manifest.engines['custom-firefox']).to.be.equal("*");
      expect(manifest.engines['nightly-firefox']).to.be.equal("*");
      expect(manifest.license).to.be.equal(responses[7]);
      done();
    });
  });

  it("sanitizes entries", function (done) {
    process.chdir(utils.tmpOutputDir);
    var responses = generateResponses();
    responses[1] = "  an invalid $ _ name 123\n";
    responses[2] = "invalid version\n";
    var proc = respond(exec("init"), responses);
    proc.on("close", function () {
      var manifest = JSON.parse(fs.readFileSync(path.join(utils.tmpOutputDir, "package.json"), "utf-8"));
      expect(manifest.name).to.be.equal("aninvalidname123");
      expect(manifest.version).to.be.equal("0.0.0");
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

function respond (proc, responses, fn) {
  var count = 0;
  proc.stdout.on("data", sendResponse);
  function sendResponse (data) {
    if (fn)
      fn(data);
    proc.stdin.write(responses[count++], "utf-8");

    if (count > responses.length) {
      proc.stdout.off("data", sendResponse);
      proc.stdin.end();
    }
  }
  return proc;
}

// Create 8 empty responses and a "yes"
function generateResponses () {
  var responses = Array(9).join("\n").split("");
  responses.push("yes\n");
  return responses;
}