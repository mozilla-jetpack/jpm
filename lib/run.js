/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var extend = require("lodash").extend;
var execute = require("./task");

function run (manifest, options) {
  return execute(manifest, extend(options, { command: "run" }));
}
module.exports = run;
