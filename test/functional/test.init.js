var execFile = require("child_process").execFile;
var fs = require("fs");
var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;

describe("jpm init", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("creates package.json with defaults", function (done) {
    process.chdir(utils.tmpOutputDir);
    // Create 8 empty responses and a "yes"
    var responses = Array(9).join("\n").split("");
    responses.push("yes\n");

    var proc = respond(exec("-m init"), responses);
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
});

function exec (args) {
  return execFile("../../bin/jpm", args.split(" "), {
    cwd: utils.tmpOutputDir
  }, function (err) {
    if (err)
      throw err;
  });
}

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
