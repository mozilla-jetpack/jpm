var jsontoxml = require("jsontoxml");
var getID = require("./utils").getID;
var parse = require("mozilla-toolkit-versioning").parse;
var GUIDS = require("./settings").ids;

/**
 * Creates an `install.rdf` file based off of an addon's `package.json`
 * object manifest. Returns a string of the composed RDF file.
 *
 * @param {Object} manifest
 * @return {String}
 */

function createRDF (manifest) {
  var header = [{
    name: "RDF",
    attrs: {
      "xmlns": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "xmlns:em": "http://www.mozilla.org/2004/em-rdf#"
    },
    children: []
  }];
  var description = {
    name: "Description",
    attrs: {
      "about": "urn:mozilla:install-manifest"
    },
    children: []
  };

  var jetpackMeta = {
    "em:id": getID(manifest),
    "em:version": manifest.version,
    "em:type": '2',
    "em:bootstrap": true,
    "em:unpack": manifest.unpack === true,
    "em:name": manifest.title || manifest.name || "Untitled",
    "em:homepageURL": manifest.homepage || "",
    "em:description": manifest.description || "",
    "em:creator": manifest.author || "",
    "em:iconURL": manifest.icon || "icon.png",
    "em:icon64URL": manifest.icon64 || "icon64.png",
  };

  header[0].children.push(description);
  description.children.push(jetpackMeta);

  Object.keys(manifest.engines || {}).forEach(function (engine) {
    description.children.push(createApplication(engine, manifest.engines[engine]));
  });

  if (manifest.translators)
    manifest.translators.forEach(function (translator) {
      description.children.push({ "em:translator": translator });
    });

  if (manifest.contributors)
    manifest.contributors.forEach(function (contributor) {
      description.children.push({ "em:contributor": contributor});
    });

  var xml = jsontoxml(header, {
    prettyPrint: true,
    xmlHeader: true,
    indent: '  '
  });

  return xml;
}
module.exports = createRDF;

function getGUID (type) {
  type = type.toUpperCase();
  return GUIDS[type];
}

function createApplication (type, versions) {
  var guid = getGUID(type);
  var parsed = parse(versions);
  if (!guid)
    throw new Error("Unrecognized application type: " + type);

  return {
    "em:targetApplication": {
      "Description": {
        "em:id": guid,
        "em:minVersion": parsed.min || "*",
        "em:maxVersion": parsed.max || "*"
      }
    }
  };
}
