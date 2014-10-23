var when = require("when");
var fs = require("fs-promise");
var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var xpi = require("../../lib/xpi");

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var aomUnsupportedPath = path.join(__dirname, "..", "addons", "aom-unsupported");
var extraFilesPath = path.join(__dirname, "..", "addons", "extra-files");
var tmpOutputDir = path.join(__dirname, "../", "tmp");

describe("lib/xpi", function () {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("Zips up cwd's addon", function (done) {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      expect(xpiPath).to.be.equal(path.join(simpleAddonPath,
                                            "@simple-addon.xpi"));
      utils.unzipTo(xpiPath, tmpOutputDir).then(function () {
        utils.compareDirs(simpleAddonPath, tmpOutputDir, done);
      });
    })
    .catch(done);
  });

  it("Zips and creates install.rdf/bootstrap.js for AOM-unsupported addons", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      expect(xpiPath).to.be.equal(path.join(aomUnsupportedPath,
                                            "@aom-unsupported.xpi"));
      return utils.unzipTo(xpiPath, tmpOutputDir).then(function () {
        var files = ["package.json", "index.js", "install.rdf", "bootstrap.js"];
        files.forEach(function (file) {
          expect(utils.isFile(path.join(tmpOutputDir, file))).to.be.equal(true);
        });
      });
    })
    .then(done, done);
  });

  it("Does not litter AOM-unsupported files", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function (xpiPath) {
      var files = fs.readdirSync(aomUnsupportedPath);
      expect(files).to.not.contain("install.rdf");
      expect(files).to.not.contain("bootstrap.js");
    })
    .then(done, done);
  });

  it("validates addon before zipping", function (done) {
    var dir = path.join(__dirname, "fixtures", "validate", "invalid-id");
    process.chdir(dir);
    var manifest = require(path.join(dir, "package.json"));
    xpi(manifest).then(utils.invalidResolve, function (error) {
      expect(error).to.be.ok;
    })
    .then(done, done);
  });

  it("Does not zip up xpi files", function (done) {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    var xpiPath = path.join(__dirname, "..", "xpis", "@simple-addon.xpi");
    var newXpiPath = path.join(simpleAddonPath, "@simple-addon.xpi");
    // Copy in a XPI since we remove it between tests for cleanup
    fs.copy(xpiPath, newXpiPath).then(function () {
      return xpi(manifest);
    })
    .then(function (xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function () {
      expect(utils.isFile(path.join(tmpOutputDir, "@simple-addon.xpi"))).to.be.equal(false);
    })
    .then(done, done);
  });

  it("Does not zip up hidden files or test directory", function (done) {
    process.chdir(extraFilesPath);
    var manifest = require(path.join(extraFilesPath, "package.json"));
    var newXpiPath = path.join(simpleAddonPath, "@simple-addon.xpi");
    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest)
    .then(function (xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function () {
      return when.all([".hidden", ".hidden-dir", "test"]
        .map(function (p) { return path.join(tmpOutputDir, p); })
        .map(function (p) { return fs.exists(p); }))
        .then(function (results) {
          results.forEach(function (exists) {
            expect(exists).to.be.equal(false);
          });
        });
    })
    .then(done, done);
  });

  it("Does zip test directory for jpm test", function (done) {
    process.chdir(extraFilesPath);
    var manifest = require(path.join(extraFilesPath, "package.json"));
    var newXpiPath = path.join(simpleAddonPath, "@simple-addon.xpi");
    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest, { command: "test" })
    .then(function (xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function (xpiPath) {
      var testExists = when.all([ ".hidden", ".hidden-dir" ]
        .map(function (p) { return path.join(tmpOutputDir, p); })
        .map(function (p) { return fs.exists(p); }))
        .then(function (results) {
          results.forEach(function (exists) {
            expect(exists).to.be.equal(false);
          });
        });

      var testDoesNotExist = when.all([ "test" ]
        .map(function (p) { return path.join(tmpOutputDir, p); })
        .map(function (p) { return fs.exists(p); }))
        .then(function (results) {
          results.forEach(function (exists) {
            expect(exists).to.be.equal(true);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("Only uses existing install.rdf", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var filePath = path.join(aomUnsupportedPath, "install.rdf");
    fs.writeFile(filePath, "TEST")
    .then(function () {
      return xpi(manifest);
    })
    .then(function (xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function () {
      expect(utils.isFile(path.join(tmpOutputDir, "bootstrap.js"))).to.be.equal(true);
      expect(utils.isFile(path.join(aomUnsupportedPath, "bootstrap.js"))).to.be.equal(false);

      return when.all([ aomUnsupportedPath, tmpOutputDir ]
        .map(function (p) { return path.join(p, "install.rdf"); })
        .map(function (p) { return fs.readFile(p, "utf-8"); }))
        .then(function(results) {
          results.forEach(function(content) {
            expect(content).to.be.equal("TEST");
          });
          done();
        });
    })
    .catch(done);
  });

  it("Only uses existing bootstrap.js", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var filePath = path.join(aomUnsupportedPath, "bootstrap.js");
    fs.writeFile(filePath, "TEST").then(function () {
      return xpi(manifest);
    })
    .then(function (xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function () {
      expect(utils.isFile(path.join(tmpOutputDir, "install.rdf"))).to.be.equal(true);
      expect(utils.isFile(path.join(aomUnsupportedPath, "install.rdf"))).to.be.equal(false);

      return when.all([ aomUnsupportedPath, tmpOutputDir ]
        .map(function (p) { return path.join(p, "bootstrap.js"); })
        .map(function (p) { return fs.readFile(p, "utf-8"); }))
        .then(function(results) {
          results.forEach(function(content) {
            expect(content).to.be.equal("TEST");
          });
          done();
        });
    })
    .catch(done);
  });

  it("Only uses existing install.rdf and bootstrap.js", function (done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var irPath = path.join(aomUnsupportedPath, "install.rdf");
    var bsPath = path.join(aomUnsupportedPath, "bootstrap.js");

    when.all([ fs.writeFile(irPath, "TEST"), fs.writeFile(bsPath, "TEST") ])
    .then(function () {
      return xpi(manifest);
    })
    .then(function (xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function () {
      expect(utils.isFile(path.join(tmpOutputDir, "install.rdf"))).to.be.equal(true);
      expect(utils.isFile(path.join(tmpOutputDir, "bootstrap.js"))).to.be.equal(true);

      expect(utils.isFile(path.join(aomUnsupportedPath, "install.rdf"))).to.be.equal(true);
      expect(utils.isFile(path.join(aomUnsupportedPath, "bootstrap.js"))).to.be.equal(true);

      return when.all([ aomUnsupportedPath, tmpOutputDir ]
        .map(function (p) { return path.join(p, "bootstrap.js"); })
        .map(function (p) { return fs.readFile(p, "utf-8"); }))
        .then(function(results) {
          results.forEach(function(content) {
            expect(content).to.be.equal("TEST");
          });
          done();
        });
    })
    .catch(done);
  });
});

function cleanXPI (done) {
  fs.unlinkSync(path.join(simpleAddonPath, "@simple-addon.xpi"));
  done();
}
