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

  var icon = manifest.icon || {};
  if (typeof icon == "string") {
    icon = { "32": icon };
  }

  var jetpackMeta = {
    "em:id": getID(manifest),
    "em:type": '2',
    "em:bootstrap": true,
    "em:unpack": manifest.unpack === true,
    "em:version": manifest.version || "0.0.0",
    "em:name": manifest.title || manifest.name || "Untitled",
    "em:description": manifest.description || undefined,
    "em:creator": formatAuthor(manifest.author),
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

  if (manifest.homepage) {
    jetpackMeta["em:homepageURL"] = manifest.homepage;
  }

  if (manifest.updateURL) {
    jetpackMeta["em:updateURL"] = manifest.updateURL;
  }

  if (manifest.updateKey) {
    jetpackMeta["em:updateKey"] = manifest.updateKey;
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
  Object.keys(jetpackMeta).forEach(function(key) {
    if (jetpackMeta[key] == undefined) {
      delete jetpackMeta[key];
    }
  });
  description.children.push(jetpackMeta);

  if (manifest.developers) {
    manifest.developers.forEach(function(dev) {
      description.children.push({ "em:developer": dev });
    })
  }

  var engines = Object.keys(manifest.engines || {});

  // If engines defined, use them
  if (engines.length) {
    engines.forEach(function (engine) {
      description.children.push(createApplication(engine, manifest.engines[engine]));
    });
  }
  // Otherwise, assume default Firefox support
  else {
    description.children.push(createApplication("Firefox"));
  }

  if (manifest.translators) {
    manifest.translators.forEach(function (translator) {
      description.children.push({ "em:translator": translator });
    });
  }

  if (manifest.contributors) {
    manifest.contributors.forEach(function (contributor) {
      description.children.push({ "em:contributor": contributor});
    });
  }

  var xml = jsontoxml(header, {
    prettyPrint: true,
    xmlHeader: true,
    indent: '  ',
    escape: true
  });

  return xml;
}
module.exports = createRDF;

function getGUID (type) {
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
function formatAuthor (author) {
  if (typeof author === "object") {
    return (author.name || "").trim();
  }
  return author || "";
}

function createApplication (type, versions) {
  var guid = getGUID(type);
  // If `versions` exists, parse it, otherwise assume defaults
  var parsed = versions ? parse(versions) : {};
  if (!guid)
    throw new Error("Unrecognized application type: " + type);

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
