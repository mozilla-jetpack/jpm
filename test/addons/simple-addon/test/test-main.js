/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const self = require("sdk/self");
const url = require("sdk/url");
const { getAddonByID } = require("sdk/addon/manager");

exports["test self.packed"] = (assert) => {
  assert.ok(self.packed, "require('sdk/self').packed is correct");
}

exports["test Addon is packed"] = function*(assert) {
  let addon = yield getAddonByID(self.id);
  console.log(addon.getResourceURI("").spec);
  assert.ok(/\.xpi$/.test(addon.getResourceURI("").spec), "the addon is packed");
}

require("sdk/test").run(exports);
