var jsontoxml = require("jsontoxml");
var FIREFOX_GUID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
var FIREFOX_MIN_VERSION = "21.0";
var FIREFOX_MAX_VERSION = "30.0a1";

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
    "em:id": options.id,
    "em:version": options.version,
    "em:type": '2',
    "em:bootstrap": true,
    "em:unpack": false,
    "em:name": options.title,
    "em:description": options.description,
    "em:creator": options.creator,
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

  var xml = jsontoxml(header, {
    prettyPrint: true,
    xmlHeader: true,
    indent: '  '
  });
  console.log(xml);
}
module.exports = createRDF;
