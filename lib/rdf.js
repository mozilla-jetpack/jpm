var jsontoxml = require("jsontoxml");
var FIREFOX_GUID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
var FIREFOX_MIN_VERSION = "21.0";
var FIREFOX_MAX_VERSION = "30.0a1";

/**
 * Creates an `install.rdf` file based off of an addon's `package.json`
 * manifest options. Returns a string of the composed RDF file.
 *
 * @param {Object} options
 * @return {String}
 */

function createRDF (options) {
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
    "em:id": options.id || (options.name + '@jetpack'),
    "em:version": options.version,
    "em:type": '2',
    "em:bootstrap": true,
    "em:unpack": false,
    "em:name": options.title || options.name || "Untitled",
    "em:homepageURL": options.homepage || "",
    "em:description": options.description,
    "em:creator": options.author || "",
    "em:iconURL": options.icon || "icon.png",
    "em:icon64URL": options.icon64 || "icon64.png",
    "em:targetApplication": {
      "Description": {
        "em:id": FIREFOX_GUID,
        "em:minVersion": FIREFOX_MIN_VERSION,
        "em:maxVersion": FIREFOX_MAX_VERSION
      }
    }
  };

  header[0].children.push(description);
  description.children.push(jetpackMeta);

  if (options.translators)
    options.translators.forEach(function (translator) {
      description.children.push({ "em:translator": translator });
    });

  if (options.contributors)
    options.contributors.forEach(function (contributor) {
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
