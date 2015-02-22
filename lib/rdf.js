/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var jsontoxml = require("jsontoxml");
var getID = require("jetpack-id");
var parse = require("mozilla-toolkit-versioning").parse;
var GUIDS = require("./settings").ids;
var utils = require("./utils");
var console = require("./utils").console;
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

  var jetpackMeta = {
    "em:id": getID(manifest),
    "em:type": '2',
    "em:bootstrap": true,
    "em:unpack": manifest.unpack === true,
    "em:version": manifest.version || "0.0.0",
    "em:name": manifest.title || manifest.name || "Untitled",
    "em:description": manifest.description || "",
    "em:creator": formatAuthor(manifest.author),
    "em:iconURL": manifest.icon || "icon.png",
    "em:icon64URL": manifest.icon64 || "icon64.png"
  };

  /* Temporary workaround for custom icon paths not being resolved correctly
   * Converts icon paths to resource:// urls, which has several drawbacks
   * TODO remove this once it's fixed in Firefox
   */

  var normalizedID = utils.normalizeID(jetpackMeta["em:id"]);

  if (manifest.icon && manifest.icon !== "icon.png") {
    console.warn("Consider using icon.png instead of a custom iconURL. \
See https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#iconURL");

    if (manifest.icon.indexOf("://") === -1) {
      jetpackMeta["em:iconURL"]= "resource://" + normalizedID + "/" + manifest.icon;
    }
  }

  if (manifest.icon64 && manifest.icon64 !== "icon64.png") {
    console.warn("Consider using icon64.png instead of a custom icon64URL. \
See https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#icon64URL");

    if (manifest.icon64.indexOf("://") === -1) {
      jetpackMeta["em:icon64URL"]= "resource://" + normalizedID + "/" + manifest.icon64;
    }
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

  header[0].children.push(description);
  description.children.push(jetpackMeta);

  if (manifest.developers) {
    manifest.developers.forEach(function(dev) {
      description.children.push({ "em:developer": dev });
    });
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
