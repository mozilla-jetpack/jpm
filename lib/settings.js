/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Set minimum version to 38.0a1, because some SDK changes are necessary.
// Must be "38.0a1", as 38.0a1 < 33.0 according to how Firefox does versioning
exports.MIN_VERSION = "38.0a1";
// Set a MAX_VERSION to use in install.rdf - this needs to be updated every once in a while
// see this page for supported ranges: https://addons.mozilla.org/en-US/firefox/pages/appversions/
exports.MAX_VERSION = "39.0";
// This isn't implemented, so crank up the AOM_SUPPORT_VERSION
exports.AOM_SUPPORT_VERSION = "40.0a";

exports.ids = {
  FIREFOX: "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
  MOZILLA: "{86c18b42-e466-45a9-ae7a-9b95ba6f5640}",
  SUNBIRD: "{718e30fb-e89b-41dd-9da7-e25a45638b28}",
  SEAMONKEY: "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
  FENNEC: "{aa3c5121-dab2-40e2-81ca-7ea25febc110}",
  THUNDERBIRD: "{3550f703-e582-4d05-9a08-453d09bdfdc6}"
};
