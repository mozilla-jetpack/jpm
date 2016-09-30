/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var when = require("when");
var fs = require("fs-promise");
var path = require("path");
var tmp = require("tmp");
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

var tmpOutputDir;

describe("lib/xpi", function() {
  beforeEach(function(done) {
    this._tmpDir = tmp.dirSync({
      prefix: "jpm-test-suite-tmp_",
      // Recursively remove the directory.
      unsafeCleanup: true,
    });
    tmpOutputDir = this._tmpDir.name;
    utils.setup(done);
  });

  afterEach(function(done) {
    if (this._tmpDir) {
      this._tmpDir.removeCallback();
    }
    utils.tearDown(done);
  });

  it("Zips up cwd's addon", function() {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    var xpiPath;
    return xpi(manifest)
      .then(function(filePath) {
        xpiPath = filePath;
        expect(xpiPath).to.be.equal(path.join(simpleAddonPath,
                                              "simple-addon.xpi"));
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function() {
        return utils.compareDirs(simpleAddonPath, tmpOutputDir);
      })
      .then(function() {
        return fs.unlink(xpiPath);
      });
  });

  it("Zips up cwd's addon in the specified directory", function() {
    process.chdir(simpleAddonPath);
    var manifest = require(path.join(simpleAddonPath, "package.json"));
    var destDir = path.join(tmpOutputDir, "jpm-tmp-dest-dir");

    return fs.mkdirs(destDir)
      .then(function() {
        return xpi(manifest, {destDir: destDir});
      })
      .then(function(filePath) {
        expect(filePath).to.be.equal(path.join(destDir, "simple-addon.xpi"));
        return utils.unzipTo(filePath, tmpOutputDir);
      })
      .then(function() {
        return fs.remove(destDir);
      })
      .then(function() {
        return utils.compareDirs(simpleAddonPath, tmpOutputDir);
      });
  });

  it("Check file name with id", function() {
    process.chdir(simpleAddonWithIdPath);
    var manifest = require(path.join(simpleAddonWithIdPath, "package.json"));
    return xpi(manifest)
      .then(function(filePath) {
        expect(filePath).to.be.equal(path.join(simpleAddonWithIdPath,
                                              "@simple-addon-1.0.0.xpi"));
        return filePath;
      })
      .then(function(filePath) {
        return fs.unlink(filePath);
      });
  });

  it("Zips and creates install.rdf/bootstrap.js for AOM-unsupported addons", function() {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    return xpi(manifest)
      .then(function(xpiPath) {
        expect(xpiPath).to.be.equal(path.join(aomUnsupportedPath,
                                              "aom-unsupported.xpi"));
        return utils.unzipTo(xpiPath, tmpOutputDir).then(function() {
          var files = ["package.json", "index.js", "install.rdf", "bootstrap.js"];
          files.forEach(function(file) {
            expect(utils.isFile(path.join(tmpOutputDir, file))).to.be.equal(true);
          });
        });
      });
  });

  it("Does not litter AOM-unsupported files", function() {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    return xpi(manifest)
      .then(function(xpiPath) {
        var files = fs.readdirSync(aomUnsupportedPath);
        expect(files).to.not.contain("install.rdf");
        expect(files).to.not.contain("bootstrap.js");
      });
  });

  it("validates addon before zipping", function() {
    var dir = path.join(__dirname, "fixtures", "validate", "invalid-id");
    process.chdir(dir);
    var manifest = require(path.join(dir, "package.json"));
    return xpi(manifest).then(utils.invalidResolve, function(error) {
      expect(error).to.be.ok;
    });
  });

  it("Does not zip up hidden files or test directory", function() {
    process.chdir(extraFilesPath);
    var manifest = require(path.join(extraFilesPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest)
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
      });
  });

  it("Does zip test directory for jpm test", function() {
    process.chdir(extraFilesPath);
    var manifest = require(path.join(extraFilesPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest, { command: "test" })
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
      });
  });

  it("Only uses existing install.rdf", function() {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var filePath = path.join(aomUnsupportedPath, "install.rdf");
    return fs.writeFile(filePath, "TEST")
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
          });
      });
  });

  it("Only uses existing bootstrap.js", function() {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var filePath = path.join(aomUnsupportedPath, "bootstrap.js");
    return fs.writeFile(filePath, "TEST")
      .then(function() {
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
          });
      });
  });

  it("Only uses existing install.rdf and bootstrap.js", function() {
    process.chdir(aomUnsupportedPath);
    var manifest = require(path.join(aomUnsupportedPath, "package.json"));
    var irPath = path.join(aomUnsupportedPath, "install.rdf");
    var bsPath = path.join(aomUnsupportedPath, "bootstrap.js");

    return when.all([ fs.writeFile(irPath, "TEST"), fs.writeFile(bsPath, "TEST") ])
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
          });
      });
  });

  it("Test default .jpmignore rules", function() {
    process.chdir(extraFilesPath);
    var ID_XPI = "extra-files.xpi";
    var ID_SIGNED_XPI = "extra_files-0.0.1-fx.xpi";
    var manifest = require(path.join(extraFilesPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest)
      .then(function(xpiPath) {
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function() {
        return when.all([ ".hidden", ".hidden-dir", "test", ID_XPI, ID_SIGNED_XPI ]
          .map(function(p) { return path.join(tmpOutputDir, p); })
          .map(function(p) { return fs.exists(p); }))
          .then(function(results) {
            results.forEach(function(exists) {
              expect(exists).to.be.equal(false);
            });
          });
      })
      .then(function() {
        return fs.writeFile(path.join(extraFilesPath, ID_SIGNED_XPI), "This is not actually a signed XPI");
      })
      .then(function() {
        return when.all([ ID_XPI, ID_SIGNED_XPI ]
          .map(function(p) { return path.join(extraFilesPath, p); })
          .map(function(p) { return fs.exists(p); }))
          .then(function(results) {
            results.forEach(function(exists) {
              expect(exists).to.be.equal(true);
            });
          });
      })
      // re-test with xpi now in place
      .then(function() {
        return xpi(manifest);
      })
      .then(function(xpiPath) {
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function() {
        return when.all([ ".hidden", ".hidden-dir", "test", ID_XPI, ID_SIGNED_XPI ]
          .map(function(p) { return path.join(tmpOutputDir, p); })
          .map(function(p) { return fs.exists(p); }))
          .then(function(results) {
            results.forEach(function(exists) {
              expect(exists).to.be.equal(false);
            });
          });
      });
  });

  it("Test .jpmignore", function() {
    process.chdir(jpmignorePath);
    var manifest = require(path.join(jpmignorePath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest)
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
      });
  });

  it("Test .jpmignore for jpm test", function() {
    process.chdir(jpmignorePath);
    var manifest = require(path.join(jpmignorePath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest, { command: "test" })
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
      });
  });

  it("Test .jpmignore with LF line-endings", function() {
    process.chdir(jpmignoreLFPath);
    var manifest = require(path.join(jpmignoreLFPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest)
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
      });
  });

  it("Test .jpmignore with CRLF line-endings", function() {
    process.chdir(jpmignoreCRLFPath);
    var manifest = require(path.join(jpmignoreCRLFPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest)
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
      });
  });

  it("Test .jpmignore with mixed line-endings", function() {
    process.chdir(jpmignoreMixedPath);
    var manifest = require(path.join(jpmignoreMixedPath, "package.json"));

    // Copy in a XPI since we remove it between tests for cleanup
    return xpi(manifest)
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
      });
  });

  it("create an updateRDF file", function() {
    process.chdir(updateRDFPath);
    var manifest = require(path.join(updateRDFPath, "package.json"));
    var xpiPath;
    return xpi(manifest)
      .then(function(filePath) {
        xpiPath = filePath;
        expect(fs.existsSync(path.join(updateRDFPath, "@simple-addon-1.0.0.update.rdf"))).to.equal(true);
        expect(fs.existsSync(path.join(updateRDFPath, "simple-addon.xpi"))).to.equal(true);
        //Removing the update.RDF file to make utils.compareDirs works
        return fs.unlink(path.join(updateRDFPath, "@simple-addon-1.0.0.update.rdf"));
      })
      .then(function() {
        return utils.unzipTo(xpiPath, tmpOutputDir);
      })
      .then(function() {
        return utils.compareDirs(updateRDFPath, tmpOutputDir);
      })
      .then(function() {
        return fs.unlink(xpiPath);
      });
  });

  it("failure in creation an updateRDF file", function() {
    process.chdir(updateRDFFailPath);
    var manifest = require(path.join(updateRDFFailPath, "package.json"));
    return xpi(manifest)
      .then(
        function(filePath) {},
        function(err) {
          expect(fs.existsSync(path.join(updateRDFFailPath, "@simple-addon-1.0.0.update.rdf"))).to.equal(false);
          expect(fs.existsSync(path.join(updateRDFFailPath, "simple-addon.xpi"))).to.equal(true);
          return;
        }
      )
      .then(function() {
        return fs.unlink(path.join(updateRDFFailPath, "simple-addon.xpi"));
      });
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
