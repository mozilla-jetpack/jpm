/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var jsontoxml = require("jsontoxml");
var getID = require("jetpack-id");
var parse = require("mozilla-toolkit-versioning").parse;
var GUIDS = require("./settings").ids;
var MIN_VERSION = require("./settings").MIN_VERSION;
var MAX_VERSION = require("./settings").MAX_VERSION;

/**
 * Creates an `install.rdf` file based off of an addon's `package.json`
 * object manifest. Returns a string of the composed RDF file.
 *
 * @param {Object} manifest
 * @return {String}
 */

function createRDF(manifest) {
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

  var icon = manifest.icon || {};
  if (typeof icon == "string") {
    icon = {
      "32": icon
    };
  }

  var jetpackMeta = {
    "em:id": getID(manifest),
    "em:type": "2",
    "em:bootstrap": true,
    "em:unpack": manifest.unpack === true,
    "em:version": manifest.version || "0.0.0",
    "em:name": manifest.title || manifest.name || "Untitled",
    "em:description": manifest.description || undefined,
    "em:creator": formatAuthor(manifest.author),
    "em:homepageURL": manifest.homepage || undefined,
    "em:updateURL": manifest.updateURL || undefined,
    "em:updateKey": manifest.updateKey || undefined,
    "em:iconURL": icon["48"] || icon["32"] || undefined,
    "em:icon64URL": icon["64"] || undefined
  };

  // these values are used by default so using them
  // in the install.rdf is not useful
  if (jetpackMeta["em:iconURL"] == "icon.png") {
    delete jetpackMeta["em:iconURL"];
  }
  if (jetpackMeta["em:icon64URL"] == "icon64.png") {
    delete jetpackMeta["em:icon64URL"];
  }

  if (manifest.preferences) {
    jetpackMeta["em:optionsURL"] = "data:text/xml,<placeholder/>";
    jetpackMeta["em:optionsType"] = 2;
  }

  if (manifest.permissions && manifest.permissions.multiprocess === true) {
    jetpackMeta["em:multiprocessCompatible"] = true;
  }

  header[0].children.push(description);

  // clean jetpackMeta
  description.children.push(cleanMetadata(jetpackMeta));

  if (manifest.developers) {
    aboutDeveloper(description.children, manifest.developers);
  }

  if (manifest.translators) {
    aboutTranslator(description.children, manifest.translators);
  }

  if (manifest.contributors) {
    aboutContributor(description.children, manifest.contributors);
  }

  var engines = Object.keys(manifest.engines || {});

  // If engines defined, use them
  if (engines.length) {
    engines.forEach(function(engine) {
      description.children.push(createApplication(
        engine, manifest.engines[engine]));
    });
  }
  // Otherwise, assume default Firefox support
  else {
    description.children.push(createApplication("Firefox"));
  }

  if (manifest.locales) {
    for (var locale in manifest.locales) {
      var l10n = manifest.locales[locale];
      var l10nDescription = [];

      var l10nMeta = {
        "em:locale": locale,
        "em:name": l10n.title || jetpackMeta["em:name"],
        "em:description": l10n.description || jetpackMeta["em:description"],
        "em:creator": jetpackMeta["em:creator"],
        "em:homepageURL": l10n.homepage || jetpackMeta["em:homepageURL"]
      };

      // clean l10nMeta
      l10nDescription.push(cleanMetadata(l10nMeta));

      if (manifest.developers) {
        aboutDeveloper(l10nDescription, manifest.developers);
      }

      if (manifest.translators) {
        aboutTranslator(l10nDescription, manifest.translators);
      }

      if (manifest.contributors) {
        aboutContributor(l10nDescription, manifest.contributors);
      }

      description.children.push({
        "em:localized": {
          "Description": l10nDescription
        }
      });
    }
  }

  var xml = jsontoxml(header, {
    prettyPrint: true,
    xmlHeader: true,
    indent: "  ",
    escape: true
  });

  return xml;
}
exports.createRDF = createRDF;

/**
 * Creates an `update.rdf` file based off of an addon's `package.json`
 * object manifest. Returns a string of the composed RDF file.
 *
 * @param {Object} manifest
 * @return {String}
 */

function createUpdateRDF(manifest) {
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
      "about": "urn:mozilla:extension:" + getID(manifest)
    },
    children: []
  };
  var enginesDescription = {
    name: "Description",
    children: []
  };
  var updateRdfTree = {
    name: "em:updates",
    children: [
      {
        name: "Seq",
        children: [
          {
            name: "li",
            children: []
          }
        ]
      }
    ]
  };

  var jetpackMeta = {
    "em:version": manifest.version || "0.0.0"
  };
  enginesDescription.children.push(jetpackMeta);

  var engines = Object.keys(manifest.engines || {});
  // If engines defined, use them
  if (engines.length) {
    engines.forEach(function(engine) {
      enginesDescription.children.push(createApplication(
        engine, manifest.engines[engine]));
    });
  }
  // Otherwise, assume default Firefox support
  else {
    enginesDescription.children.push(createApplication("Firefox"));
  }
  //we ad the updateLink for each engine
  enginesDescription.children.forEach(function(descriptionData, index) {
    if (Object.keys(descriptionData) == "em:targetApplication") {
      enginesDescription.children[index][Object.keys(descriptionData)].
        Description["em:updateLink"] = manifest.updateLink;
    }
  });

  updateRdfTree.children[0].children[0].children.push(enginesDescription);
  description.children.push(updateRdfTree);
  header[0].children.push(description);

  var xml = jsontoxml(header, {
    prettyPrint: true,
    xmlHeader: true,
    indent: "  ",
    escape: true
  });

  return xml;
}
exports.createUpdateRDF = createUpdateRDF;

function getGUID(type) {
  if (type.match(/^\{[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\}$/)) {
    return type;
  }
  return GUIDS[(type = type.toUpperCase())];
}

/**
 * Formats the package.json's `author` key to pull out the name
 * in the following formats, for use with the `em:creator` key in the
 * install.rdf:
 *
 * "Jordan Santell"
 * "Jordan Santell <jsantell@mozilla.com>"
 * { name: "Jordan Santell", email: "jsantell@mozilla.com" }
 */
function formatAuthor(author) {
  if (typeof author === "object") {
    return author.name || undefined;
  }
  return author || undefined;
}

function createApplication(type, versions) {
  var guid = getGUID(type);
  // If `versions` exists, parse it, otherwise assume defaults
  var parsed = versions ? parse(versions) : {};
  if (!guid) {
    throw new Error("Unrecognized application type: " + type);
  }

  return {
    "em:targetApplication": {
      "Description": {
        "em:id": guid,
        "em:minVersion": parsed.min || MIN_VERSION,
        "em:maxVersion": parsed.max || MAX_VERSION
      }
    }
  };
}

function cleanMetadata(metadata) {
  Object.keys(metadata).forEach(function(key) {
    if (metadata[key] === undefined) {
      delete metadata[key];
    }
  });
  return metadata;
}

function aboutDeveloper(group, members) {
  members.forEach(function(member) {
    group.push({"em:developer": member});
  });
}

function aboutTranslator(group, members) {
  members.forEach(function(member) {
    group.push({"em:translator": member});
  });
}

function aboutContributor(group, members) {
  members.forEach(function(member) {
    group.push({"em:contributor": member});
  });
}
