/* jshint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { id } = require("sdk/self");
const { getAddonByID } = require("sdk/addon/manager");

const IGNORED_FILES = [ ".hidden", ".hidden-dir" ];

exports.testIgnoredHiddenFiles = function*(assert) {
  let addon = yield getAddonByID(id);
  IGNORED_FILES.forEach(file => {
    assert.equal(addon.hasResource(file), false, "does not have " + file);
  });
}

require("sdk/test").run(exports);
