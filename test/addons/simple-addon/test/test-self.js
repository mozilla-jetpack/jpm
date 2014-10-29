/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var self = require("sdk/self");

exports["test require helper"] = function(assert) {
  assert.equal(self.id, "@simple-addon", "self.id works without an id")
};

require("sdk/test").run(exports);
