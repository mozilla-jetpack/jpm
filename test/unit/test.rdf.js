var createRDF = require("../../lib/rdf");
var DOMParser = require("xmldom").DOMParser;
var parse = require("mozilla-toolkit-versioning").parse;
var chai = require("chai");
var expect = chai.expect;
var GUIDS = require("../../lib/settings").ids;
var MIN_VERSION = require("../../lib/settings").MIN_VERSION;

describe("lib/rdf", function () {
  describe("defaults", function () {
    it("uses default values when none specified", function () {
      var xml = setupRDF({ id: "myaddon@jetpack" });
      expect(getData(xml, "em:id")).to.be.equal("myaddon@jetpack");
      // This should throw elsewhere
      expect(getData(xml, "em:version")).to.be.equal("undefined");
      expect(getData(xml, "em:bootstrap")).to.be.equal("true");
      expect(getData(xml, "em:unpack")).to.be.equal("false");
      expect(getData(xml, "em:type")).to.be.equal("2");
      expect(getData(xml, "em:name")).to.be.equal("Untitled");
      expect(getData(xml, "em:iconURL")).to.be.equal("icon.png");
      expect(getData(xml, "em:icon64URL")).to.be.equal("icon64.png");
      ["homepageURL", "description", "creator"].forEach(function (field) {
        expect(nodeEmpty(xml, "em:" + field)).to.be.equal(true);
      });

      expect(nodeExists(xml, "em:translator")).to.be.equal(false);
      expect(nodeExists(xml, "em:contributor")).to.be.equal(false);
    });
  });

  describe("attributes", function () {
    it("parses a correct ID", function () {
      var xml = setupRDF({ id: "myaddon" });
      expect(getData(xml, "em:id")).to.be.equal("myaddon@jetpack");
    });
    it("passes in a version", function () {
      var xml = setupRDF({ version: "1.4.1" });
      expect(getData(xml, "em:version")).to.be.equal("1.4.1");
    });
    it("name uses `title` first", function () {
      var xml = setupRDF({ title: "my-title", name: "my-name" });
      expect(getData(xml, "em:name")).to.be.equal("my-title");
    });
    it("name uses `name` after `title`", function () {
      var xml = setupRDF({ name: "my-name" });
      expect(getData(xml, "em:name")).to.be.equal("my-name");
    });
    it("homepageURL uses `homepage`", function () {
      var xml = setupRDF({ homepage: "http://mozilla.com" });
      expect(getData(xml, "em:homepageURL")).to.be.equal("http://mozilla.com");
    });
    it("unpack uses `unpack`", function () {
      var xml = setupRDF({ unpack: true });
      expect(getData(xml, "em:unpack")).to.be.equal("true");
    });
    it("description uses `description`", function () {
      var xml = setupRDF({ description: "my-desc" });
      expect(getData(xml, "em:description")).to.be.equal("my-desc");
    });
    it("creator uses `author`", function () {
      var xml = setupRDF({ author: "Marie Curie" });
      expect(getData(xml, "em:creator")).to.be.equal("Marie Curie");
    });
    it("iconURL uses `icon`", function () {
      var xml = setupRDF({ icon: "megaman.png" });
      expect(getData(xml, "em:iconURL")).to.be.equal("megaman.png");
    });
    it("icon64URL uses `icon64`", function () {
      var xml = setupRDF({ icon64: "megaman.png" });
      expect(getData(xml, "em:icon64URL")).to.be.equal("megaman.png");
    });

    it("adds `translator` fields for each translator", function () {
      var xml = setupRDF({ translators: [
        "Bebop", "Rocksteady"
      ]});
      var translators = xml.getElementsByTagName("em:translator");
      expect(translators.length).to.be.equal(2);
      expect(translators[0].childNodes[0].data).to.be.equal("Bebop");
      expect(translators[1].childNodes[0].data).to.be.equal("Rocksteady");
    });

    it("adds `contributor` fields for each contributor", function () {
      var xml = setupRDF({ contributors: [
        "Bebop", "Rocksteady"
      ]});
      var translators = xml.getElementsByTagName("em:contributor");
      expect(translators.length).to.be.equal(2);
      expect(translators[0].childNodes[0].data).to.be.equal("Bebop");
      expect(translators[1].childNodes[0].data).to.be.equal("Rocksteady");
    });
  });

  describe("engines", function () {
    it("adds engine min/max from engine string for firefox", function () {
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
    it("adds engine min/max from engine string for fennec", function () {
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
    it("handles multiple engines specified", function () {
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

    it("replaces undefined max versions with asterisks", function () {
      var xml = setupRDF({ engines: {
        fennec: ">=25.0"
      }});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var fennec = apps[0].childNodes[1]; // Description
      expect(fennec.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(fennec.childNodes[3].childNodes[0].data).to.be.equal("25.0");
      expect(fennec.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(fennec.childNodes[5].childNodes[0].data).to.be.equal("*");
    });
    
    it("replaces undefined min versions with asterisks", function () {
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
    it("creates default Firefox targetApplication if no engines defined", function () {
      var xml = setupRDF({ engines: {}});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var firefox = apps[0].childNodes[1]; // Description
      expect(firefox.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(firefox.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(firefox.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(firefox.childNodes[5].childNodes[0].data).to.be.equal("*");
    });
    it("creates default Firefox targetApplication if no engines field", function () {
      var xml = setupRDF({});
      var apps = xml.getElementsByTagName("em:targetApplication");
      var firefox = apps[0].childNodes[1]; // Description
      expect(firefox.childNodes[3].tagName).to.be.equal("em:minVersion");
      expect(firefox.childNodes[3].childNodes[0].data).to.be.equal(MIN_VERSION);
      expect(firefox.childNodes[5].tagName).to.be.equal("em:maxVersion");
      expect(firefox.childNodes[5].childNodes[0].data).to.be.equal("*");
    });
  });
});

function setupRDF (manifest) {
  return new DOMParser().parseFromString(createRDF(manifest));
}

function getData (xml, tag) {
  return xml.getElementsByTagName(tag)[0].childNodes[0].data;
}

function nodeExists (xml, tag) {
  return !!xml.getElementsByTagName(tag).length;
}

function nodeEmpty (xml, tag) {
  return !xml.getElementsByTagName(tag).childNodes;
}
