/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const self = require("sdk/self");
const { getAddonByID } = require("sdk/addon/manager");
const { uninstall } = require("sdk/addon/installer");

exports["test uninstall"] = function(assert, done) {
  let id = "test-success@jetpack";
  getAddonByID(id)
    .then((addon) => {
      assert.pass("Add-on exists!");
      return addon.id;
    })
    .then(uninstall)
    .then(() => {
      assert.pass("Add-on was uninstalled!");
    })
    .then(done)
    .catch(console.exception);
};

require("sdk/test").run(exports);
