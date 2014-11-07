/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const self = require("sdk/self");
const url = require("sdk/url");
const { getAddonByID } = require("sdk/addon/manager");

exports["test self.packed"] = function (assert) {
  assert.ok(!self.packed, "require('sdk/self').packed is correct");
}

exports["test url.toFilename"] = function (assert) {
  assert.ok(/.*main\.js$/.test(url.toFilename(module.uri)),
            "url.toFilename() on resource: URIs should work");
}

exports["test Addon is unpacked"] = function*(assert) {
  let addon = yield getAddonByID(self.id);
  assert.equal(addon.getResourceURI("").scheme, "file", "the addon is unpacked");
}

require("sdk/test").run(exports);
