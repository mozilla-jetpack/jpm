/* jshint mocha: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var os = require("os");
var fs = require("fs");
var path = require("path");
var chai = require("chai");
var expect = chai.expect;
var utils = require("../../lib/utils");
var all = require("when").all;
var hasAOMSupport = utils.hasAOMSupport;

var simpleAddonPath = path.join(__dirname, "..", "addons", "simple-addon");
var simpleAddonXPI = path.join(__dirname, "..", "xpis", "@simple-addon.xpi");
var prevDir, prevBinary;

describe("lib/utils", function() {
  beforeEach(function() {
    if (process.env.JPM_FIREFOX_BINARY) {
      prevBinary = process.env.JPM_FIREFOX_BINARY;
    }
    prevDir = process.cwd();
  });
  afterEach(function() {
    if (prevBinary) {
      process.env.JPM_FIREFOX_BINARY = prevBinary;
    }
    process.chdir(prevDir);
  });

  describe("getManifest", function() {
    it("returns manifest in simple-addon directory", function() {
      return utils.getManifest({addonDir: simpleAddonPath}).then(function(manifest) {
        expect(manifest.name).to.be.equal("simple-addon");
        expect(manifest.title).to.be.equal("My Simple Addon");
      });
    });

    it("gets the manifest from the current working dir by default", function() {
      process.chdir(simpleAddonPath);
      return utils.getManifest().then(function(manifest) {
        expect(manifest.name).to.be.equal("simple-addon");
      });
    });

    it("returns manifest from custom XPI file", function() {
      return utils.getManifest({
        xpiPath: simpleAddonXPI,
        addonDir: path.join(__dirname, "..", "addons") // pass in an invalid dir just to make sure it's not used
      }).then(function(manifest) {
        expect(manifest.name).to.be.equal("simple-addon");
        expect(manifest.title).to.be.equal("My Simple Addon");
      });
    });

    it("returns {} when no package.json found", function() {
      var noAddonDir = path.join(__dirname, "..", "addons");
      return utils.getManifest({addonDir: noAddonDir})
        .then(function(manifest) {
          expect(Object.keys(manifest).length).to.be.equal(0);
        });
    });

    it("returns {} when no package.json found in XPI", function() {
      var noPackageXPI = path.join(__dirname, "..", "xpis",
                                   "@missing-package-json.xpi");
      return utils.getManifest({xpiPath: noPackageXPI})
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(/no manifest found/);
        });
    });
  });

  describe("extractXPI", function() {

    it("lets you inspect an XPI", function() {
      return utils.extractXPI(simpleAddonXPI)
        .then(function(tmpXPI) {
          try {
            var manifest = require(
              path.join(tmpXPI.path, 'package.json'));
            expect(manifest.name).to.be.equal("simple-addon");
          } catch (e) {
            tmpXPI.remove();
            throw e;
          }
        });
    });

    it("requires you to remove the tmp dir when finished", function() {
      return utils.extractXPI(simpleAddonXPI)
        .then(function(tmpXPI) {
          expect(fs.statSync(tmpXPI.path).isDirectory())
            .to.be.equal(true);

          tmpXPI.remove();

          expect(function() {
            fs.statSync(tmpXPI.path);
          }).to.throw(/no such file or directory/);
        });
    });

    it("throws error for non-existant XPI file", function() {
      var badXPIFile = path.join(__dirname, "..", "not-a-real-file.xpi");
      return utils.extractXPI(badXPIFile)
        .then(function() {
          throw new Error("unexpected success");
        }).catch(function(err) {
          expect(err.message).to.include("ENOENT");
          expect(err.message).to.include(badXPIFile);
        });
    });

    it("throws error for invalid zip file", function() {
      var badXPIFile = path.join(__dirname, "..", "xpis", "@invalid-zip.xpi");
      return utils.extractXPI(badXPIFile)
        .then(function() {
          throw new Error("unexpected success");
        }).catch(function(err) {
          expect(err.message).to.include("Could not find the End of Central Directory Record");
        });
    });

    it("throws error for directories (not XPIs)", function() {
      return utils.extractXPI(__dirname)
        .then(function() {
          throw new Error("unexpected success");
        }).catch(function(err) {
          expect(err.message).to.include("expected an XPI file");
        });
    });

    it("throws error for undefined xpiPath", function() {
      return utils.extractXPI(undefined)
        .then(function() {
          throw new Error("unexpected success");
        }).catch(function(err) {
          expect(err.message).to.include("xpiPath cannot be empty");
        });
    });

  });

  describe("getXpiInfoFromInstallRdf", function() {

    it("throws for missing RDF element", function() {
      var xml = "<?xml version=\"1.0\"?><empty></empty>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(/Could not find root RDF element/);
        });
    });

    it("throws for missing descriptions", function() {
      var xml = "<?xml version=\"1.0\"?><RDF:RDF><whatever/></RDF:RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(/Could not find descriptions/);
        });
    });

    it("throws for missing manifest element", function() {
      var xml = "<?xml version=\"1.0\"?><RDF:RDF>" +
                "<RDF:Description RDF:about=\"rdf:#$ZUQlk2\"/>" +
                "</RDF:RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(
            /Could not find .*install-manifest Description/);
        });
    });

    it("throws for missing ID", function() {
      var xml = "<?xml version=\"1.0\"?><RDF:RDF>" +
                "<RDF:Description RDF:about=\"urn:mozilla:install-manifest\">" +
                "</RDF:Description>" +
                "</RDF:RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(/ID was empty/);
        });
    });

    it("throws for missing version", function() {
      var xml = "<?xml version=\"1.0\"?><RDF:RDF>" +
                "<RDF:Description RDF:about=\"urn:mozilla:install-manifest\">" +
                  "<em:id>sugar-pants</em:id>" +
                "</RDF:Description>" +
                "</RDF:RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(/Version was empty/);
        });
    });

    it("throws for broken RDF XML", function() {
      var xml = "this-is-not valid >XML<";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function() {
          throw new Error('Unexpected success');
        })
        .catch(function(err) {
          expect(err.message).to.match(/install\.rdf: Non-whitespace before first tag/);
        });
    });

    it("finds ID and version from attributes", function() {
      var xml = "<?xml version=\"1.0\"?><RDF:RDF>" +
                "<RDF:Description RDF:about=\"urn:mozilla:install-manifest\" " +
                  "em:id=\"sugar-pants\" " +
                  "em:version=\"0.0.1\" " +
                ">" +
                "</RDF:Description>" +
                "</RDF:RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function(info) {
          expect(info.id).to.be.equal("sugar-pants");
          expect(info.version).to.be.equal("0.0.1");
          expect(info.manifest).to.be.equal(null);
        });
    });

    it("finds ID and version from properties", function() {
      var xml = "<?xml version=\"1.0\"?><RDF:RDF>" +
                "<RDF:Description RDF:about=\"urn:mozilla:install-manifest\">" +
                  "<em:id>sugar-pants</em:id>" +
                  "<em:version>0.0.1</em:version>" +
                "</RDF:Description>" +
                "</RDF:RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function(info) {
          expect(info.id).to.be.equal("sugar-pants");
          expect(info.version).to.be.equal("0.0.1");
          expect(info.manifest).to.be.equal(null);
        });
    });

    it("can handle unprefixed RDF files", function() {
      var xml = "<?xml version=\"1.0\"?>" +
                "<RDF>" +
                "<Description about=\"urn:mozilla:install-manifest\">" +
                  "<em:id>sugar-pants</em:id>" +
                  "<em:version>0.0.1</em:version>" +
                "</Description>" +
                "</RDF>";
      return utils.getXpiInfoFromInstallRdf(xml)
        .then(function(info) {
          expect(info.id).to.be.equal("sugar-pants");
          expect(info.version).to.be.equal("0.0.1");
        });
    });

  });

  describe("hasAOMSupport", function() {
    it("hasAOMSupport true for valid ranges", function() {
      [">=51 <=54", ">=50.0a <=52", ">=50", ">=51.0a"].forEach(function(range) {
        expect(hasAOMSupport({ engines: { "firefox": range } })).to.be.equal(true);
      });
    });
    it("hasAOMSupport false for invalid ranges", function() {
      [">=28 <=34", ">=30 <=32", ">=26", ">=30.0a", ">=38 <=44"].forEach(function(range) {
        expect(hasAOMSupport({ engines: { "firefox": range } })).to.be.equal(false);
      });
    });
    it("hasAOMSupport false for unspecified min", function() {
      ["<26", "<=32", "<40.0a"].forEach(function(range) {
        expect(hasAOMSupport({ engines: { "firefox": range } })).to.be.equal(false);
      });
    });
    it("hasAOMSupport false for no engines field", function() {
      expect(hasAOMSupport({})).to.be.equal(false);
    });
    it("hasAOMSupport false for unpopulated engines field", function() {
      expect(hasAOMSupport({ engines: {}})).to.be.equal(false);
    });
    it("hasAOMSupport false for one valid and one invalid engine", function() {
      expect(hasAOMSupport({ engines: {
        "firefox": ">=40.0a",
        "fennec": "<31"
      }})).to.be.equal(false);
    });
  });
});
