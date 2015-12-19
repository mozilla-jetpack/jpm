/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci } = require("chrome");
const { quit, eForceQuit } = Cc["@mozilla.org/toolkit/app-startup;1"].
                             getService(Ci.nsIAppStartup);

exports.startup = (reasonCode, prefs) => {
  console.log("OVERLOADED STARTUP");
  console.log("SHUTTING DOWN");
  quit(eForceQuit);
}
