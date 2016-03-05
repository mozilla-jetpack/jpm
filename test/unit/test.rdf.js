/* jshint mocha: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var RDF = require("../../lib/rdf");
var DOMParser = require("xmldom").DOMParser;
var parse = require("mozilla-toolkit-versioning").parse;
var chai = require("chai");
var expect = chai.expect;
var GUIDS = require("../../lib/settings").ids;
var MIN_VERSION = require("../../lib/settings").MIN_VERSION;
var MAX_VERSION = require("../../lib/settings").MAX_VERSION;
var getData = require("../../lib/xpi/utils").getData;

describe("lib/rdf", function() {
  describe("defaults", function() {
    it("uses default values when none specified", function() {
      var str = RDF.createRDF({ id: "myaddon@jetpack" });
      var xml = parseRDF(str);
      expect(getData(xml, "em:id")).to.be.equal("myaddon@jetpack");
      // This should throw elsewhere
      expect(getData(xml, "em:version")).to.be.equal("0.0.0");
      expect(getData(xml, "em:bootstrap")).to.be.equal("true");
      expect(getData(xml, "em:unpack")).to.be.equal("false");
      expect(getData(xml, "em:type")).to.be.equal("2");
      expect(getData(xml, "em:name")).to.be.equal("Untitled");
      expect(getData(xml, "em:description")).to.be.equal(undefined);
      expect(getData(xml, "em:iconURL")).to.be.equal(undefined);
      expect(getData(xml, "em:icon64URL")).to.be.equal(undefined);
      expect(getData(xml, "em:translator")).to.be.equal(undefined);
      expect(getData(xml, "em:contributor")).to.be.equal(undefined);
      expect(str.indexOf("homepageURL")).to.be.equal(-1);
      ["description", "creator"].forEach(function(field) {
        expect(nodeEmpty(xml, "em:" + field)).to.be.equal(true);
      });

      expect(nodeExists(xml, "em:description")).to.be.equal(false);
      expect(nodeExists(xml, "em:iconURL")).to.be.equal(false);
      expect(nodeExists(xml, "em:icon64URL")).to.be.equal(false);
      expect(nodeExists(xml, "em:translator")).to.be.equal(false);
      expect(nodeExists(xml, "em:contributor")).to.be.equal(false);
    });
  });

  describe("attributes", function() {
    it("parses a correct ID", function() {
      var xml = setupRDF({ id: "myaddon@jetpack" });
      expect(getData(xml, "em:id")).to.be.equal("myaddon@jetpack");
    });

    it("passes in a version", function() {
      var xml = setupRDF({ version: "1.4.1" });
      expect(getData(xml, "em:version")).to.be.equal("1.4.1");
    });

    it("name uses `title` first", function() {
      var xml = setupRDF({ title: "my-title", name: "my-name" });
      expect(getData(xml, "em:name")).to.be.equal("my-title");
    });

    it("name uses `name` after `title`", function() {
      var xml = setupRDF({ name: "my-name" });
      expect(getData(xml, "em:name")).to.be.equal("my-name");
    });

    it("name is xml-escaped", function() {
      var xml = RDF.createRDF({ name: "my-nam>e" });
      expect(xml.indexOf("my-nam&gt;e")).to.be.not.equal(-1);
    });

    it("homepage uses `homepageURL`", function() {
      var xml = setupRDF({ homepage: "http://mozilla.com" });
      expect(getData(xml, "em:homepageURL")).to.be.equal("http://mozilla.com");
    });

    it("unpack uses `unpack`", function() {
      var xml = setupRDF({ unpack: true });
      expect(getData(xml, "em:unpack")).to.be.equal("true");
    });

    it("description uses `description`", function() {
      var xml = setupRDF({ description: "my-desc" });
      expect(getData(xml, "em:description")).to.be.equal("my-desc");
    });

    it("description is xml-escaped", function() {
      var xml = RDF.createRDF({ name: "my-des>c" });
      expect(xml.indexOf("my-des&gt;c")).to.be.not.equal(-1);
    });

    it("creator uses `author`", function() {
      var xml = setupRDF({ author: "Marie Curie" });
      expect(getData(xml, "em:creator")).to.be.equal("Marie Curie");
    });

    it("author is xml-escaped", function() {
      var xml = RDF.createRDF({ name: "Marie Curie <mc@espci.fr>" });
      expect(xml.indexOf("Marie Curie &lt;mc@espci.fr&gt;")).to.be.not.equal(-1);
    });

    it("iconURL uses `icon` with string", function() {
      var xml = setupRDF({ icon: "megaman.png" });
      expect(getData(xml, "em:iconURL")).to.be.equal("megaman.png");
    });

    it("iconURL uses `icon` with object no 48", function() {
      var xml = setupRDF({ icon: { "32": "foo32.png" } });
      expect(getData(xml, "em:iconURL")).to.be.equal("foo32.png");
    });

    // Use 48 because as of Fx 4 48 can be used in place of 32
    it("iconURL uses `icon` with object and 48", function() {
      var xml = setupRDF({ icon: {
        "32": "foo32.png",
        "48": "foo48.png"
      } });
      expect(getData(xml, "em:iconURL")).to.be.equal("foo48.png");
    });

    // Use 48 because as of Fx 4 48 can be used in place of 32
    it("iconURL uses `icon` with object with no 32", function() {
      var xml = setupRDF({ icon: { "48": "foo48.png" } });
      expect(getData(xml, "em:iconURL")).to.be.equal("foo48.png");
    });

    it("iconURL ignores default `icon.png`", function() {
      var xml = setupRDF({ icon: "icon.png" });
      expect(getData(xml, "em:iconURL")).to.be.equal(undefined);
      expect(getData(xml, "em:icon64URL")).to.be.equal(undefined);
    });

    it("icon64URL uses `icon64`", function() {
      var xml = setupRDF({ icon: { "64": "megaman.png" } });
      expect(getData(xml, "em:icon64URL")).to.be.equal("megaman.png");
    });

    it("icon64URL ignores default `icon64.png`", function() {
      var xml = setupRDF({ icon: { "64": "icon64.png" } });
      expect(getData(xml, "em:iconURL")).to.be.equal(undefined);
      expect(getData(xml, "em:icon64URL")).to.be.equal(undefined);
    });

    it("updateURL uses `updateURL`", function() {
      var url =  "https://mozilla.org/update.rdf";
      var xml = setupRDF({ updateURL: url });
      expect(getData(xml, "em:updateURL")).to.be.equal(url);
    });

    it("updateURL DNE when it is undefined", function() {
      var xml = RDF.createRDF({ id: "1" });
      expect(xml.indexOf("updateURL")).to.be.equal(-1);

      xml = RDF.createRDF({ id: "1", updateURL: undefined });
      expect(xml.indexOf("updateURL")).to.be.equal(-1);
    });

    it("updateKey uses `updateKey`", function() {
      var key =  "xyz";
      var xml = setupRDF({ updateKey: key });
      expect(getData(xml, "em:updateKey")).to.be.equal(key);
    });

    it("updateKey DNE when it is undefined", function() {
      var xml = RDF.createRDF({ id: "1" });
      expect(xml.indexOf("updateKey")).to.be.equal(-1);

      xml = RDF.createRDF({ id: "1", updateKey: undefined });
      expect(xml.indexOf("updateKey")).to.be.equal(-1);
    });

    it("multiprocess permission", function() {
      var xml = parseRDF(RDF.createRDF({ id: "1" }));
      expect(nodeExists(xml, "em:multiprocessCompatible")).to.be.equal(false);
      expect(getData(xml, "em:multiprocessCompatible")).to.be.equal(undefined);

      xml = parseRDF(RDF.createRDF({ id: "1", permissions: { multiprocess: true } }));
      expect(nodeExists(xml, "em:multiprocessCompatible")).to.be.equal(true);
      expect(getData(xml, "em:multiprocessCompatible")).to.be.equal("true");

      xml = parseRDF(RDF.createRDF({ id: "1", permissions: { multiprocess: false } }));
      expect(nodeExists(xml, "em:multiprocessCompatible")).to.be.equal(false);
      expect(getData(xml, "em:multiprocessCompatible")).to.be.equal(undefined);
    });

    it("adds `translator` fields for each translator", function() {
      var xml = setupRDF({ translators: [
        "Bebop", "Rocksteady"
      ]});
      var translators = xml.getElementsByTagName("em:translator");
      expect(translators.length).to.be.equal(2);
      expect(translators[0].childNodes[0].data).to.be.equal("Bebop");
      expect(translators[1].childNodes[0].data).to.be.equal("Rocksteady");
    });

    it("adds `contributor` fields for each contributor", function() {
      var xml = setupRDF({ contributors: [
        "Bebop", "Rocksteady"
      ]});
      var translators = xml.getElementsByTagName("em:contributor");
      expect(translators.length).to.be.equal(2);
      expect(translators[0].childNodes[0].data).to.be.equal("Bebop");
      expect(translators[1].childNodes[0].data).to.be.equal("Rocksteady");
    });
  });

  describe("author", function() {
    it("handles `author` fields with 'name <email@address.com>'", function() {
      var xml = setupRDF({ author: "Marie Curie <mc@espci.fr>" });
      expect(getData(xml, "em:creator")).to.be.equal("Marie Curie <mc@espci.fr>");
    });

    it("handles `author` fields with only an email address", function() {
      var xml = setupRDF({ author: "mc@espci.fr" });
      expect(getData(xml, "em:creator")).to.be.equal("mc@espci.fr");
    });

    it("handles `author` field as an object with `name` field", function() {
      var xml = setupRDF({ author: { name: "Marie Curie", email: "mc@espci.fr"} });
      expect(getData(xml, "em:creator")).to.be.equal("Marie Curie");
    });
  });

  describe("engines", function() {
    it("adds engine min/max from engine string for firefox", function() {
      var xml = setupRDF({ engines: { firefox: ">=21.0a <32.0" }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var app = apps[0].childNodes[1]; // Description
      expect(apps.length).to.be.equal(1);
      expect(app.tagName).to.be.equal("Description");
      expect(app.childNodes[1].tagName).to.be.equal("em:id");
      expect(app.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FIREFOX);
      expect(app.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(app.childNodes[3].childNodes[0].data).to.be.equal("21.0a");
      expect(app.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(app.childNodes[5].childNodes[0].data).to.be.equal("32.0.-1");
    });

    it("adds engine min/max from engine string for fennec", function() {
      var xml = setupRDF({ engines: { fennec: ">=21.0a <32.0" }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var app = apps[0].childNodes[1]; // Description
      expect(apps.length).to.be.equal(1);
      expect(app.tagName).to.be.equal("Description");
      expect(app.childNodes[1].tagName).to.be.equal("em:id");
      expect(app.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FENNEC);
      expect(app.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(app.childNodes[3].childNodes[0].data).to.be.equal("21.0a");
      expect(app.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(app.childNodes[5].childNodes[0].data).to.be.equal("32.0.-1");
    });

    it("handles multiple engines specified", function() {
      var xml = setupRDF({ engines: {
        fennec: ">=25.0a <=32.0",
        firefox: ">=21.0a <=33.0",
      }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      expect(apps.length).to.be.equal(2);
      var fennec = apps[0].childNodes[1]; // Description
      var firefox = apps[1].childNodes[1]; // Description

      expect(fennec.tagName).to.be.equal("Description");
      expect(fennec.childNodes[1].tagName).to.be.equal("em:id");
      expect(fennec.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FENNEC);
      expect(fennec.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(fennec.childNodes[3].childNodes[0].data).to.be.equal("25.0a");
      expect(fennec.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(fennec.childNodes[5].childNodes[0].data).to.be.equal("32.0");

      expect(firefox.tagName).to.be.equal("Description");
      expect(firefox.childNodes[1].tagName).to.be.equal("em:id");
      expect(firefox.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FIREFOX);
      expect(firefox.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(firefox.childNodes[3].childNodes[0].data).to.be.equal("21.0a");
      expect(firefox.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(firefox.childNodes[5].childNodes[0].data).to.be.equal("33.0");
    });

    it("replaces undefined max versions with MAX_VERSION", function() {
      var xml = setupRDF({ engines: {
        fennec: ">=25.0"
      }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var fennec = apps[0].childNodes[1]; // Description
      expect(fennec.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(fennec.childNodes[3].childNodes[0].data).to.be.equal("25.0");
      expect(fennec.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(fennec.childNodes[5].childNodes[0].data).to.be.equal(MAX_VERSION);
    });

    it("handles wildcard versions with MIN_VERSION - *", function() {
      var xml = setupRDF({ engines: {
        firefox: "*"
      }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var fennec = apps[0].childNodes[1]; // Description
      expect(fennec.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(fennec.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(fennec.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(fennec.childNodes[5].childNodes[0].data).to.be.equal(MAX_VERSION);
    });

    it("replaces undefined min versions with MIN_VERSION", function() {
      var xml = setupRDF({ engines: {
        fennec: "<30.0"
      }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var fennec = apps[0].childNodes[1]; // Description
      expect(fennec.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(fennec.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(fennec.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(fennec.childNodes[5].childNodes[0].data).to.be.equal("30.0.-1");
    });

    it("creates default Firefox targetApplication if no engines defined", function() {
      var xml = setupRDF({ engines: {}});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var firefox = apps[0].childNodes[1]; // Description
      expect(firefox.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(firefox.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(firefox.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(firefox.childNodes[5].childNodes[0].data).to.be.equal(MAX_VERSION);
    });

    it("creates default Firefox targetApplication if no engines field", function() {
      var xml = setupRDF({});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var firefox = apps[0].childNodes[1]; // Description
      expect(firefox.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(firefox.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(firefox.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(firefox.childNodes[5].childNodes[0].data).to.be.equal(MAX_VERSION);
    });

    it("passes through raw GUIDs as targetApplication", function() {
      var xml = setupRDF({ engines: {
        "{e95a4b1e-901d-d035-4077-e95157a7a118}": "*"
      }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var application = apps[0].childNodes[1]; // Description
      expect(application.childNodes[1].tagName).to.be.equal("em:id");
      expect(application.childNodes[1].childNodes[0].data).to.be.equal("{e95a4b1e-901d-d035-4077-e95157a7a118}");
    });
  });

  describe("locales", function() {
    it("add `ja` title, description, and homepage to add-on", function() {
      var xml = setupRDF({ title: "my-title", description: "my-desc", homepage: "my-page",
        locales: {
          "ja" : {
            title: "名前",
            description: "紹介",
            homepage: "ホームページ",
          }
        }
      });
      var locales = xml.getElementsByTagName("em:localized");
      var locale = locales[0].childNodes[1]; // Description
      expect(locales.length).to.be.equal(1);
      expect(locale.tagName).to.be.equal("Description");
      expect(locale.childNodes[1].tagName).to.be.equal("em:locale");
      expect(locale.childNodes[1].childNodes[0].data).to.be.equal("ja");
      expect(locale.childNodes[3].tagName).to.be.equal("em:name");
      expect(locale.childNodes[3].childNodes[0].data).to.be.equal("名前");
      expect(locale.childNodes[5].tagName).to.be.equal("em:description");
      expect(locale.childNodes[5].childNodes[0].data).to.be.equal("紹介");
      expect(locale.childNodes[7].tagName).to.be.equal("em:homepageURL");
      expect(locale.childNodes[7].childNodes[0].data).to.be.equal("ホームページ");
    });

    it("add `ja` title and homepage to add-on w/o description", function() {
      var xml = setupRDF({ title: "my-title", homepage: "my-page",
        locales: {
          "ja" : {
            title: "名前",
            homepage: "ホームページ",
          }
        }
      });
      var locales = xml.getElementsByTagName("em:localized");
      var locale = locales[0].childNodes[1]; // Description
      expect(locales.length).to.be.equal(1);
      expect(locale.tagName).to.be.equal("Description");
      expect(locale.childNodes[1].tagName).to.be.equal("em:locale");
      expect(locale.childNodes[1].childNodes[0].data).to.be.equal("ja");
      expect(locale.childNodes[3].tagName).to.be.equal("em:name");
      expect(locale.childNodes[3].childNodes[0].data).to.be.equal("名前");
      expect(locale.childNodes[5].tagName).to.be.equal("em:homepageURL");
      expect(locale.childNodes[5].childNodes[0].data).to.be.equal("ホームページ");
    });

    it("add `ja` title and description to add-on w/o description", function() {
      var xml = setupRDF({ title: "my-title", homepage: "my-page",
        locales: {
          "ja" : {
            title: "名前",
            description: "紹介",
          }
        }
      });
      var locales = xml.getElementsByTagName("em:localized");
      var locale = locales[0].childNodes[1]; // Description
      expect(locales.length).to.be.equal(1);
      expect(locale.tagName).to.be.equal("Description");
      expect(locale.childNodes[1].tagName).to.be.equal("em:locale");
      expect(locale.childNodes[1].childNodes[0].data).to.be.equal("ja");
      expect(locale.childNodes[3].tagName).to.be.equal("em:name");
      expect(locale.childNodes[3].childNodes[0].data).to.be.equal("名前");
      expect(locale.childNodes[5].tagName).to.be.equal("em:description");
      expect(locale.childNodes[5].childNodes[0].data).to.be.equal("紹介");
      expect(locale.childNodes[7].tagName).to.be.equal("em:homepageURL");
      expect(locale.childNodes[7].childNodes[0].data).to.be.equal("my-page");
    });

    it("add `ja` description and homepage to add-on w/o description", function() {
      var xml = setupRDF({ title: "my-title", homepage: "my-page",
        locales: {
          "ja" : {
            description: "紹介",
            homepage: "ホームページ",
          }
        }
      });
      var locales = xml.getElementsByTagName("em:localized");
      var locale = locales[0].childNodes[1]; // Description
      expect(locales.length).to.be.equal(1);
      expect(locale.tagName).to.be.equal("Description");
      expect(locale.childNodes[1].tagName).to.be.equal("em:locale");
      expect(locale.childNodes[1].childNodes[0].data).to.be.equal("ja");
      expect(locale.childNodes[3].tagName).to.be.equal("em:name");
      expect(locale.childNodes[3].childNodes[0].data).to.be.equal("my-title");
      expect(locale.childNodes[5].tagName).to.be.equal("em:description");
      expect(locale.childNodes[5].childNodes[0].data).to.be.equal("紹介");
      expect(locale.childNodes[7].tagName).to.be.equal("em:homepageURL");
      expect(locale.childNodes[7].childNodes[0].data).to.be.equal("ホームページ");
    });

    it("add `ja` & `zh-CN` title, description, and homepage to add-on", function() {
      var xml = setupRDF({ title: "my-title", description: "my-desc", homepage: "my-page",
        locales: {
          "ja" : {
            title: "名前",
            description: "紹介",
            homepage: "ホームページ",
          },
          "zh-CN" : {
            title: "扩展",
            description: "说明",
            homepage: "主页",
          }
        }
      });
      var locales = xml.getElementsByTagName("em:localized");
      var localeJa = locales[0].childNodes[1]; // Description
      var localeZhs = locales[1].childNodes[1]; // Description
      expect(locales.length).to.be.equal(2);

      expect(localeJa.tagName).to.be.equal("Description");
      expect(localeJa.childNodes[1].tagName).to.be.equal("em:locale");
      expect(localeJa.childNodes[1].childNodes[0].data).to.be.equal("ja");
      expect(localeJa.childNodes[3].tagName).to.be.equal("em:name");
      expect(localeJa.childNodes[3].childNodes[0].data).to.be.equal("名前");
      expect(localeJa.childNodes[5].tagName).to.be.equal("em:description");
      expect(localeJa.childNodes[5].childNodes[0].data).to.be.equal("紹介");
      expect(localeJa.childNodes[7].tagName).to.be.equal("em:homepageURL");
      expect(localeJa.childNodes[7].childNodes[0].data).to.be.equal("ホームページ");

      expect(localeZhs.tagName).to.be.equal("Description");
      expect(localeZhs.childNodes[1].tagName).to.be.equal("em:locale");
      expect(localeZhs.childNodes[1].childNodes[0].data).to.be.equal("zh-CN");
      expect(localeZhs.childNodes[3].tagName).to.be.equal("em:name");
      expect(localeZhs.childNodes[3].childNodes[0].data).to.be.equal("扩展");
      expect(localeZhs.childNodes[5].tagName).to.be.equal("em:description");
      expect(localeZhs.childNodes[5].childNodes[0].data).to.be.equal("说明");
      expect(localeZhs.childNodes[7].tagName).to.be.equal("em:homepageURL");
      expect(localeZhs.childNodes[7].childNodes[0].data).to.be.equal("主页");
    });

    it("add `ja` title and homepage & `zh-CN` description to add-on only with homepage", function() {
      var xml = setupRDF({ homepage: "my-page",
        locales: {
          "ja" : {
            title: "名前",
            homepage: "ホームページ",
          },
          "zh-CN" : {
            description: "说明"
          }
        }
      });
      var locales = xml.getElementsByTagName("em:localized");
      var localeJa = locales[0].childNodes[1]; // Description
      var localeZhs = locales[1].childNodes[1]; // Description
      expect(locales.length).to.be.equal(2);

      expect(localeJa.tagName).to.be.equal("Description");
      expect(localeJa.childNodes[1].tagName).to.be.equal("em:locale");
      expect(localeJa.childNodes[1].childNodes[0].data).to.be.equal("ja");
      expect(localeJa.childNodes[3].tagName).to.be.equal("em:name");
      expect(localeJa.childNodes[3].childNodes[0].data).to.be.equal("名前");
      expect(localeJa.childNodes[5].tagName).to.be.equal("em:homepageURL");
      expect(localeJa.childNodes[5].childNodes[0].data).to.be.equal("ホームページ");

      expect(localeZhs.tagName).to.be.equal("Description");
      expect(localeZhs.childNodes[1].tagName).to.be.equal("em:locale");
      expect(localeZhs.childNodes[1].childNodes[0].data).to.be.equal("zh-CN");
      expect(localeZhs.childNodes[3].tagName).to.be.equal("em:name");
      expect(localeZhs.childNodes[3].childNodes[0].data).to.be.equal("Untitled");
      expect(localeZhs.childNodes[5].tagName).to.be.equal("em:description");
      expect(localeZhs.childNodes[5].childNodes[0].data).to.be.equal("说明");
      expect(localeZhs.childNodes[7].tagName).to.be.equal("em:homepageURL");
      expect(localeZhs.childNodes[7].childNodes[0].data).to.be.equal("my-page");
    });
  });

  describe("createUpdateRDF", function() {
    it("create the update.rdf file with the correct value", function() {
      var str = RDF.createUpdateRDF(
        {
          id : "myaddon@jetpack",
          updateLink: "https://mozilla.org/myaddon.xpi",
          version: "1.4.1",
          engines: { fennec: ">=21.0a <32.0" }
        }
      );
      var xml = parseRDF(str);

      // Check <RDF><Description about="..."/>...
      var allDescriptions = xml.getElementsByTagName("Description");
      var firstDesc = allDescriptions[0];
      expect(firstDesc.tagName).to.be.equal("Description");
      expect(firstDesc.getAttribute("about"))
        .to.be.equal("urn:mozilla:extension:myaddon@jetpack");

      expect(getData(xml, "em:version")).to.be.equal("1.4.1");
      var apps = xml.getElementsByTagName("em:targetApplication");
      // Check the <Description> nested inside <em:targetApplication>
      var app = apps[0].childNodes[1];
      expect(apps.length).to.be.equal(1);
      expect(app.tagName).to.be.equal("Description");
      expect(app.childNodes[1].tagName).to.be.equal("em:id");
      expect(app.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FENNEC);
      expect(app.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(app.childNodes[3].childNodes[0].data).to.be.equal("21.0a");
      expect(app.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(app.childNodes[5].childNodes[0].data).to.be.equal("32.0.-1");
      expect(app.childNodes[7].tagName).to.be.equal("em:updateLink");
      expect(app.childNodes[7].childNodes[0].data).to.be.equal("https://mozilla.org/myaddon.xpi");
    });

    it("create the update.rdf file with multiple engine", function() {
      var str = RDF.createUpdateRDF(
        {
          id : "myaddon@jetpack",
          updateLink: "https://mozilla.org/myaddon.xpi",
          version: "1.4.1",
          engines: { fennec: ">=21.0a <32.0", firefox: ">=21.0a <=33.0"}
        }
      );
      var xml = parseRDF(str);

      expect(getData(xml, "em:version")).to.be.equal("1.4.1");
      var apps = xml.getElementsByTagName("em:targetApplication");
      var fennec = apps[0].childNodes[1]; // Description
      var firefox = apps[1].childNodes[1];
      expect(apps.length).to.be.equal(2);

      expect(fennec.tagName).to.be.equal("Description");
      expect(fennec.childNodes[1].tagName).to.be.equal("em:id");
      expect(fennec.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FENNEC);
      expect(fennec.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(fennec.childNodes[3].childNodes[0].data).to.be.equal("21.0a");
      expect(fennec.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(fennec.childNodes[5].childNodes[0].data).to.be.equal("32.0.-1");
      expect(fennec.childNodes[7].tagName).to.be.equal("em:updateLink");
      expect(fennec.childNodes[7].childNodes[0].data).to.be.equal("https://mozilla.org/myaddon.xpi");

      expect(firefox.tagName).to.be.equal("Description");
      expect(firefox.childNodes[1].tagName).to.be.equal("em:id");
      expect(firefox.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FIREFOX);
      expect(firefox.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(firefox.childNodes[3].childNodes[0].data).to.be.equal("21.0a");
      expect(firefox.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(firefox.childNodes[5].childNodes[0].data).to.be.equal("33.0");
      expect(firefox.childNodes[7].tagName).to.be.equal("em:updateLink");
      expect(firefox.childNodes[7].childNodes[0].data).to.be.equal("https://mozilla.org/myaddon.xpi");
    });

    it("create the update.rdf file with default value", function() {
      var str = RDF.createUpdateRDF(
        {
          id : "myaddon@jetpack",
          updateLink: "https://mozilla.org/myaddon.xpi"
        }
      );
      var xml = parseRDF(str);

      expect(getData(xml, "em:version")).to.be.equal("0.0.0");
      var apps = xml.getElementsByTagName("em:targetApplication");
      var app = apps[0].childNodes[1]; // Description
      expect(apps.length).to.be.equal(1);
      expect(app.tagName).to.be.equal("Description");
      expect(app.childNodes[1].tagName).to.be.equal("em:id");
      expect(app.childNodes[1].childNodes[0].data).to.be.equal(GUIDS.FIREFOX);
      expect(app.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(app.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(app.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(app.childNodes[5].childNodes[0].data).to.be.equal(MAX_VERSION);
      expect(app.childNodes[7].tagName).to.be.equal("em:updateLink");
      expect(app.childNodes[7].childNodes[0].data).to.be.equal("https://mozilla.org/myaddon.xpi");
    });
  });
});

function parseRDF(rdf) {
  return new DOMParser().parseFromString(rdf, "application/rdf+xml");
}

function setupRDF (manifest) {
  return parseRDF(RDF.createRDF(manifest));
}

function nodeExists (xml, tag) {
  return !!xml.getElementsByTagName(tag).length;
}

function nodeEmpty (xml, tag) {
  return !xml.getElementsByTagName(tag).childNodes;
}
