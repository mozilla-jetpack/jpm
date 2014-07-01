/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var m = require("../lib/main");
var self = require("sdk/self");
var tabs = require("sdk/tabs");

exports.testMain = function(assert) {
  assert.ok(m.button, 'button exists');
  assert.ok(m.toolbar, 'toolbar exists');
};

require('sdk/test').run(exports);
