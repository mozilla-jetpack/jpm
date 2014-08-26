var utils = require("../utils");
var path = require("path");
var exec = utils.exec;
var chai = require("chai");
var expect = chai.expect;

var addonsPath = path.join(__dirname, "..", "fixtures");

var binary = process.env.JPM_FIREFOX_BINARY || "nightly";

describe("jpm test", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("test-success", function (done) {
    var addonPath = path.join(addonsPath, "test-success");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test", options, function (err, stdout, stderr) {
      expect(err).to.not.be.ok;
      expect(stdout).to.contain("2 of 2 tests passed.");
      expect(stdout).to.contain("All tests passed!");
      done();
    });
  });

  it("test-failure", function (done) {
    var addonPath = path.join(addonsPath, "test-failure");
    process.chdir(addonPath);

    var options = { cwd: addonPath, env: { JPM_FIREFOX_BINARY: binary }};
    var proc = exec("test", options, function (err, stdout, stderr) {
      expect(err).to.not.be.ok;
      expect(stdout).to.contain("1 of 2 tests passed.");
      expect(stdout).to.not.contain("All tests passed!");
      done();
    });
  });
});
