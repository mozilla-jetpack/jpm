/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { metadata } = require("@loader/options");

exports["test metadata exists"] = function(assert) {
  assert.ok(metadata, "metadata exists")
};

require("sdk/test").run(exports);
