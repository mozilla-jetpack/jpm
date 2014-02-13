var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var xpi = require("../../lib/xpi");

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var aomUnsupportedPath = path.join(__dirname, "..", "addons", "aom-unsupported");
var tmpOutputDir = path.join(__dirname, "../", "tmp");
var prevCwd;

describe("lib/xpi", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("Zips up cwd's addon", function (done) {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      expect(xpiPath).to.be.equal(path.join(simpleAddonPath,
                                            "@simple-addon.xpi"));
      utils.unzipTo(xpiPath, tmpOutputDir, function () {
        utils.compareDirs(simpleAddonPath, tmpOutputDir, done);
      });
    }).then(null, done);
  });

  it("Zips and creates install.rdf/bootstrap.js for AOM-unsupported addons", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      expect(xpiPath).to.be.equal(path.join(aomUnsupportedPath,
                                            "@aom-unsupported.xpi"));
      utils.unzipTo(xpiPath, tmpOutputDir, function () {
        var files = ["package.json", "index.js", "install.rdf", "bootstrap.js"];
        files.forEach(function (file) {
          expect(utils.isFile(path.join(tmpOutputDir, file))).to.be.equal(true);
        });
        done();
      });
    }).then(null, done);
  });
  
  it("Created install.rdf/bootstrap.js for AOM-unsupported addons are 644 mode", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      utils.unzipTo(xpiPath, tmpOutputDir, function () {
        var files = ["install.rdf", "bootstrap.js"];
        files.forEach(function (file) {
          var stat = fs.statSync(path.join(tmpOutputDir, file));
          expect(parseInt(stat.mode.toString(8), 10)).to.be.equal(100644);
        });
        done();
      });
    }).then(null, done);
  });

  it("Does not litter AOM-unsupported files", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      var files = fs.readdirSync(aomUnsupportedPath);
      expect(files).to.not.contain("install.rdf");
      expect(files).to.not.contain("bootstrap.js");
    }).then(done, done);
  });

  it("validates addon before zipping", function (done) {
    var dir = path.join(__dirname, "fixtures", "validate", "invalid-id");
    process.chdir(dir);
    var manifest = require(path.join(dir, "package.json"));
    xpi(manifest).then(utils.invalidResolve, function (errors) {
      expect(errors).to.be.ok;
      expect(errors.toString()).to.contain("must be a valid ID");
    }).then(done, done);
  });
});

function cleanXPI (done) {
  fs.unlinkSync(path.join(simpleAddonPath, "@simple-addon.xpi"));
  done();
}
