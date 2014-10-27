/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

exports["test require main"] = function(assert) {
  let main = require("../lib/index");
  assert.ok(main.testMain, "the helper export works")
};

require("sdk/test").run(exports);
