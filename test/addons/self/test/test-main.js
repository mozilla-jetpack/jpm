/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const self = require("sdk/self");
const { Cu } = require("chrome");
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm", {});
const { defer } = require("sdk/core/promise");

function getAddonByID(id) {
  let { promise, resolve } = defer();
  AddonManager.getAddonByID(id, resolve);
  return promise;
}

exports["test self.data.load"] = (assert) => {

  assert.equal(self.data.load("data.md").trim(),
               "# hello world",
               "paths work");

  assert.equal(self.data.load("./data.md").trim(),
               "# hello world",
               "relative paths work");
};

exports["test self.id"] = function*(assert) {
  assert.equal(self.id, "test-self@jetpack", "self.id should be correct.");
  let addon = yield getAddonByID(self.id);
  assert.equal(addon.id, "test-self@jetpack", "addon.id should be correct.");
};

require("sdk/test").run(exports);
