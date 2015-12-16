/* jshint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { id } = require('sdk/self');
const { Services } = require('resource://gre/modules/Services.jsm');

exports.testDefaultPrefs = function(assert) {
  // this should not have been changed by jpm
  assert.equal(
    Services.prefs.getBoolPref("devtools.debugger.log"),
    false,
    'The devtools.debugger.log pref is not changed from default');

  // this is set in ../../lib/preferences.js, when usng jpm run
  assert.equal(
    Services.prefs.getBoolPref("javascript.options.strict"),
    true,
    'The javascript.options.strict pref is changed from default');
};

require('sdk/test/runner').runTestsFromModule(module);
