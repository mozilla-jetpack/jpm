/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var when = require("when");
var fs = require("fs-promise");
var path = require("path");
var utils = require("../utils");
var chai = require("chai");
var expect = chai.expect;
var xpi = require("../../lib/xpi");

var simpleAddonPath = path.join(__dirname, "..", "fixtures", "simple-addon");
var simpleAddonWithIdPath = path.join(__dirname, "..", "fixtures", "simple-addon-with-id");
var aomUnsupportedPath = path.join(__dirname, "..", "fixtures", "aom-unsupported");
var extraFilesPath = path.join(__dirname, "..", "addons", "extra-files");
var jpmignorePath = path.join(__dirname, "..", "addons", "jpmignore");
var jpmignoreLFPath = path.join(__dirname, "..", "addons", "jpmignore-lf");
var jpmignoreCRLFPath = path.join(__dirname, "..", "addons", "jpmignore-crlf");
var jpmignoreMixedPath = path.join(__dirname, "..", "addons", "jpmignore-mixed");
var tmpOutputDir = path.join(__dirname, "../", "tmp");
var targetDir = path.join(__dirname, "../", "target");
var updateRDFPath = path.join(__dirname, "..", "fixtures", "updateRDF");
var updateRDFFailPath = path.join(__dirname, "..", "fixtures", "updateRDF-fail");
var webextensionManifestExcludedPath = path.join(
  __dirname, "..", "fixtures", "webext-manifest-excluded"
);
var webextensionManifestExcludedJPMIgnorePath = path.join(
  __dirname, "..", "fixtures", "webext-manifest-excluded-jpmignore"
);
var webextensionManifestEmbeddedPath = path.join(
  __dirname, "..", "fixtures", "webext-embed"
);

describe("lib/xpi", function() {
  beforeEach(utils.setup);
  afterEach(utils.tearDown);

  it("Zips up cwd's addon", function(done) {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    var xpiPath;
    return xpi(manifest).then(function(filePath) {
      xpiPath = filePath;
      expect(xpiPath).to.be.equal(path.join(simpleAddonPath,
                                            "simple-addon.xpi"));
      return utils.unzipTo(xpiPath, tmpOutputDir).then(function() {
        utils.compareDirs(simpleAddonPath, tmpOutputDir);
      });
    })
    .then(function() {
      fs.unlink(xpiPath);
      done();
    })
    .catch(done);
  });

  it("Zips up cwd's addon in the specified directory", function() {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    fs.mkdirs(targetDir);
    return xpi(manifest, {destDir: targetDir}).then(function(filePath) {
      expect(filePath).to.be.equal(path.join(targetDir, "simple-addon.xpi"));
      return utils.unzipTo(filePath, tmpOutputDir).then(function() {
        utils.compareDirs(simpleAddonPath, tmpOutputDir);
      });
    })
    .then(function() {
      fs.remove(targetDir);
    });
  });

  it("Check file name with id", function(done) {
    process.chdir(simpleAddonWithIdPath);
    var manifest = require(path.join(simpleAddonWithIdPath, "package.json"));
    return xpi(manifest).then(function(filePath) {
      expect(filePath).to.be.equal(path.join(simpleAddonWithIdPath,
                                            "@simple-addon-1.0.0.xpi"));
      return filePath;
    })
    .then(function(filePath) {
      fs.unlink(filePath);
      done();
    });
  });

  it("Zips and creates install.rdf/bootstrap.js for AOM-unsupported addons", function(done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function(xpiPath) {
      expect(xpiPath).to.be.equal(path.join(aomUnsupportedPath,
                                            "aom-unsupported.xpi"));
      return utils.unzipTo(xpiPath, tmpOutputDir).then(function() {
        var files = ["package.json", "index.js", "install.rdf", "bootstrap.js"];
        files.forEach(function(file) {
          expect(utils.isFile(path.join(tmpOutputDir, file))).to.be.equal(true);
        });
      });
    })
    .then(done, done);
  });

  it("Does not litter AOM-unsupported files", function(done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    xpi(manifest).then(function(xpiPath) {
      var files = fs.readdirSync(aomUnsupportedPath);
      expect(files).to.not.contain("install.rdf");
      expect(files).to.not.contain("bootstrap.js");
    })
    .then(done, done);
  });

  it("validates addon before zipping", function(done) {
    var dir = path.join(__dirname, "fixtures", "validate", "invalid-id");
    process.chdir(dir);
    var manifest = require(path.join(dir, "package.json"));
    xpi(manifest).then(utils.invalidResolve, function(error) {
      expect(error).to.be.ok;
    })
    .then(done, done);
  });

  it("Does not zip up hidden files or test directory", function(done) {
    process.chdir(extraFilesPath);
    var manifest = require(path.join(extraFilesPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest)
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function() {
      return when.all([".hidden", ".hidden-dir", "test"]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });
    })
    .then(done, done);
  });

  it("Does zip test directory for jpm test", function(done) {
    process.chdir(extraFilesPath);
    var manifest = require(path.join(extraFilesPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest, { command: "test" })
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function(xpiPath) {
      var testExists = when.all([ ".hidden", ".hidden-dir" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });

      var testDoesNotExist = when.all([ "test" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("Only uses existing install.rdf", function(done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var filePath = path.join(aomUnsupportedPath, "install.rdf");
    fs.writeFile(filePath, "TEST")
    .then(function() {
      return xpi(manifest);
    })
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function() {
      expect(utils.isFile(path.join(tmpOutputDir, "bootstrap.js"))).to.be.equal(true);
      expect(utils.isFile(path.join(aomUnsupportedPath, "bootstrap.js"))).to.be.equal(false);

      return when.all([ aomUnsupportedPath, tmpOutputDir ]
        .map(function(p) { return path.join(p, "install.rdf"); })
        .map(function(p) { return fs.readFile(p, "utf-8"); }))
        .then(function(results) {
          results.forEach(function(content) {
            expect(content).to.be.equal("TEST");
          });
          done();
        });
    })
    .catch(done);
  });

  it("Only uses existing bootstrap.js", function(done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var filePath = path.join(aomUnsupportedPath, "bootstrap.js");
    fs.writeFile(filePath, "TEST").then(function() {
      return xpi(manifest);
    })
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function() {
      expect(utils.isFile(path.join(tmpOutputDir, "install.rdf"))).to.be.equal(true);
      expect(utils.isFile(path.join(aomUnsupportedPath, "install.rdf"))).to.be.equal(false);

      return when.all([ aomUnsupportedPath, tmpOutputDir ]
        .map(function(p) { return path.join(p, "bootstrap.js"); })
        .map(function(p) { return fs.readFile(p, "utf-8"); }))
        .then(function(results) {
          results.forEach(function(content) {
            expect(content).to.be.equal("TEST");
          });
          done();
        });
    })
    .catch(done);
  });

  it("Only uses existing install.rdf and bootstrap.js", function(done) {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var irPath = path.join(aomUnsupportedPath, "install.rdf");
    var bsPath = path.join(aomUnsupportedPath, "bootstrap.js");

    when.all([ fs.writeFile(irPath, "TEST"), fs.writeFile(bsPath, "TEST") ])
    .then(function() {
      return xpi(manifest);
    })
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function() {
      expect(utils.isFile(path.join(tmpOutputDir, "install.rdf"))).to.be.equal(true);
      expect(utils.isFile(path.join(tmpOutputDir, "bootstrap.js"))).to.be.equal(true);

      expect(utils.isFile(path.join(aomUnsupportedPath, "install.rdf"))).to.be.equal(true);
      expect(utils.isFile(path.join(aomUnsupportedPath, "bootstrap.js"))).to.be.equal(true);

      return when.all([ aomUnsupportedPath, tmpOutputDir ]
        .map(function(p) { return path.join(p, "bootstrap.js"); })
        .map(function(p) { return fs.readFile(p, "utf-8"); }))
        .then(function(results) {
          results.forEach(function(content) {
            expect(content).to.be.equal("TEST");
          });
          done();
        });
    })
    .catch(done);
  });

  it("Test default .jpmignore rules", function(done) {
    process.chdir(extraFilesPath);
    var ID_XPI = "extra-files.xpi";
    var ID_SIGNED_XPI = "extra_files-0.0.1-fx.xpi";
    var manifest = require(path.join(extraFilesPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest).
    then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    }).
    then(function() {
      return when.all([ ".hidden", ".hidden-dir", "test", ID_XPI, ID_SIGNED_XPI ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });
    }).
    then(function() {
      return fs.writeFile(path.join(extraFilesPath, ID_SIGNED_XPI), "This is not actually a signed XPI");
    }).
    then(function() {
      return when.all([ ID_XPI, ID_SIGNED_XPI ]
        .map(function(p) { return path.join(extraFilesPath, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });
    }).
    // re-test with xpi now in place
    then(function() {
      return xpi(manifest);
    }).
    then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    }).
    then(function() {
      return when.all([ ".hidden", ".hidden-dir", "test", ID_XPI, ID_SIGNED_XPI ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });
    }).
    then(done, done);
  });

  it("Test .jpmignore", function(done) {
    process.chdir(jpmignorePath);
    var manifest = require(path.join(jpmignorePath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest)
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function(xpiPath) {
      var testExists = when.all([ "!important!.txt", "index.js", "package.json", "mozilla-sha1/sha1.c", "negated/jpmkeep", "test/test" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });

      var testDoesNotExist = when.all([ ".jpmignore", "cat-file.c", "some.txt", "a", "ignore", "tests", "test/tests" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("Test .jpmignore for jpm test", function(done) {
    process.chdir(jpmignorePath);
    var manifest = require(path.join(jpmignorePath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest, { command: "test" })
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function(xpiPath) {
      var testExists = when.all([ "!important!.txt", "index.js", "package.json", "mozilla-sha1/sha1.c", "negated/jpmkeep", "test/test", "test/tests", "tests/test", "tests/test" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });

      var testDoesNotExist = when.all([ ".jpmignore", "cat-file.c", "some.txt", "a", "ignore" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("Test .jpmignore with LF line-endings", function(done) {
    process.chdir(jpmignoreLFPath);
    var manifest = require(path.join(jpmignoreLFPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest)
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function(xpiPath) {
      var testExists = when.all([ "index.js", "package.json", "include" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });

      var testDoesNotExist = when.all([ ".gitattributes", ".jpmginore", "ignore" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("Test .jpmignore with CRLF line-endings", function(done) {
    process.chdir(jpmignoreCRLFPath);
    var manifest = require(path.join(jpmignoreCRLFPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest)
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function(xpiPath) {
      var testExists = when.all([ "index.js", "package.json", "include" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });

      var testDoesNotExist = when.all([ ".gitattributes", ".jpmginore", "ignore" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("Test .jpmignore with mixed line-endings", function(done) {
    process.chdir(jpmignoreMixedPath);
    var manifest = require(path.join(jpmignoreMixedPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    xpi(manifest)
    .then(function(xpiPath) {
      return utils.unzipTo(xpiPath, tmpOutputDir);
    })
    .then(function(xpiPath) {
      var testExists = when.all([ "index.js", "package.json", "include" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });

      var testDoesNotExist = when.all([ ".gitattributes", ".jpmginore", "ignore" ]
        .map(function(p) { return path.join(tmpOutputDir, p); })
        .map(function(p) { return fs.exists(p); }))
        .then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });

      return when.all([ testExists, testDoesNotExist ]);
    })
    .then(function() {
      done();
    }, done);
  });

  it("create an updateRDF file", function(done) {
    process.chdir(updateRDFPath);
    var manifest = require(path.join(updateRDFPath, "package.json"));
    var xpiPath;
    return xpi(manifest).then(function(filePath) {
      xpiPath = filePath;
      expect(fs.existsSync(path.join(updateRDFPath, "@simple-addon-1.0.0.update.rdf"))).to.equal(true);
      expect(fs.existsSync(path.join(updateRDFPath, "simple-addon.xpi"))).to.equal(true);
      //Removing the update.RDF file to make utils.compareDirs works
      fs.unlink(path.join(updateRDFPath, "@simple-addon-1.0.0.update.rdf"));
      return utils.unzipTo(xpiPath, tmpOutputDir).then(function() {
        utils.compareDirs(updateRDFPath, tmpOutputDir);
      });
    })
    .then(function() {
      fs.unlink(xpiPath);
      done();
    })
    .catch(done);
  });

  it("failure in creation an updateRDF file", function(done) {
    process.chdir(updateRDFFailPath);
    var manifest = require(path.join(updateRDFFailPath, "package.json"));
    return xpi(manifest).then(
      function(filePath) {},
      function(err) {
        expect(fs.existsSync(path.join(updateRDFFailPath, "@simple-addon-1.0.0.update.rdf"))).to.equal(false);
        expect(fs.existsSync(path.join(updateRDFFailPath, "simple-addon.xpi"))).to.equal(true);
        return;
      }
    )
    .then(function() {
      fs.unlink(path.join(updateRDFFailPath, "simple-addon.xpi"));
      done();
    })
    .catch(done);
  });

  it("Exclude manifest.json when it exists in the addon root dir", function() {
    process.chdir(webextensionManifestExcludedPath);

    // In this test scenario, jpm is executed against a WebExtension that contains
    // both a package.json and a manifest.json files in the root dir, probably because
    // the add-on is being built from an npm package, and no .jpmignore is defined in this addon
    var manifest = require(path.join(webextensionManifestExcludedPath, "package.json"));
    return xpi(manifest)
      .then(function(xpiPath) {
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function(xpiPath) {
        return when.all(
          [ "manifest.json" ]
            .map(function(p) { return path.join(tmpOutputDir, p); })
            .map(function(p) { return fs.exists(p); })
        ).then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });
      });
  });

  it("Exclude ./manifest.json even if not included in a .jpmignore file", function() {
    process.chdir(webextensionManifestExcludedJPMIgnorePath);

    // In this test scenario, jpm is executed against a WebExtension that contains
    // both a package.json and a manifest.json files in the root dir, and there
    // is a .jpmignore file that doesn't contains the manifest.json.
    var manifest = require(path.join(webextensionManifestExcludedJPMIgnorePath,
                                     "package.json"));
    return xpi(manifest)
      .then(function(xpiPath) {
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function(xpiPath) {
        return when.all(
          [ "manifest.json", "ignored.txt" ]
            .map(function(p) { return path.join(tmpOutputDir, p); })
            .map(function(p) { return fs.exists(p); })
        ).then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(false);
          });
        });
      });
  });

  it("Doesn't exclude webextension/manifest.json needed by SDK hybrid addons", function() {
    process.chdir(webextensionManifestEmbeddedPath);

    // In this test scenario, jpm is executed against an SDK hybrid addon,
    // and the 'webextension/manifest.json' file should not be excluded from the
    // generated xpi.
    var manifest = require(path.join(webextensionManifestEmbeddedPath,
                                     "package.json"));
    return xpi(manifest)
      .then(function(xpiPath) {
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function(xpiPath) {
        return when.all(
          [ "webextension/manifest.json" ]
            .map(function(p) { return path.join(tmpOutputDir, p); })
            .map(function(p) { return fs.exists(p); })
        ).then(function(results) {
          results.forEach(function(exists) {
            expect(exists).to.be.equal(true);
          });
        });
      });
  });

});
