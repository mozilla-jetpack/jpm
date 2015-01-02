/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var self = require('sdk/self');
const { install } = require("sdk/addon/installer");

console.log("init!")


// Install test add-on
install(self.data.url("test-addon.xpi")).then(() => {
  // disable/uninstall itself?
  console.log("install!!")
}).catch(console.exception);

