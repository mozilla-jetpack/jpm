var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var exec = utils.exec;
var isWindows = /^win/.test(process.platform);

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var fakeBinary = path.join(__dirname, "..", "utils", "dummybinary" +
  (isWindows ? ".bat" : ".sh"));

describe("jpm run", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  describe("-b/--binary <BINARY>", function () {
    it("Uses specified binary instead of default Firefox", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary, { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-profile");
        done();
      });
    });
  });

  describe("--binary-args <CMDARGS>", function () {
    it("Passes in additional arguments to Firefox (single)", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " --binary-args -some-value", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-some-value");
        done();
      });
    });

    it("Passes in additional arguments to Firefox (multiple)", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " --binary-args \"-one -two -three\"", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-one -two -three");
        done();
      });
    });
  });

  describe("-p/--profile", function () {
    it("Passes in a relative profile path to Firefox with -profile", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " -p ./path/to/profile", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-profile ./path/to/profile");
        done();
      });
    });
    
    it("Passes in a absolute profile path to Firefox with -profile", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " -p /path/to/profile", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-profile /path/to/profile");
        done();
      });
    });
    
    it("Passes in a profile name to Firefox with -P", function (done) {
      process.chdir(simpleAddonPath);
      var proc = exec("run -v -b " + fakeBinary + " -p MY_PROFILE", { cwd: simpleAddonPath }, function (err, stdout, stderr) {
        expect(err).to.not.be.ok;
        expect(stdout).to.contain("-P MY_PROFILE");
        done();
      });
    });
  });
});
