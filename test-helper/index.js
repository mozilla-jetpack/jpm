/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var self = require('sdk/self');
const AddonInstaller = require("sdk/addon/installer");

//const { AddonManager } = require("resource://gre/modules/AddonManager.jsm");

// Install test add-on
AddonInstaller.install(self.data.url("test-addon.xpi")).then(() => {
  // disable/uninstall itself?
});
