"use strict";

const { Cc, Ci } = require("chrome");
const prefs = Cc['@mozilla.org/preferences-service;1'].
                    getService(Ci.nsIPrefService).
                    QueryInterface(Ci.nsIPrefBranch);
const { quit, eForceQuit } = Cc['@mozilla.org/toolkit/app-startup;1'].
                             getService(Ci.nsIAppStartup);

const exit = () => quit(eForceQuit);

const read = (name, defaultValue=null) => {
  switch (prefs.getPrefType(name)) {
    case Ci.nsIPrefBranch.PREF_STRING:
      return prefs.getComplexValue(name, Ci.nsISupportsString).data;

    case Ci.nsIPrefBranch.PREF_INT:
      return prefs.getIntPref(name);

    case Ci.nsIPrefBranch.PREF_BOOL:
      return prefs.getBoolPref(name);

    default:
      return defaultValue;
  }
}

const params = {
  command: read("extensions.@param-dump.sdk.load.command"),

  profileMemory: read("extensions.@param-dump.sdk.profile.memory"),
  checkMemory: read("extensions.@param-dump.sdk.profile.leaks"),

  filter: read("extensions.@param-dump.sdk.test.filter"),
  stopOnError: read("extensions.@param-dump.sdk.test.stop") === 1,
  times: read("extensions.@param-dump.sdk.test.iterations"),

  tbpl: read("extensions.@param-dump.sdk.output.format") === "tbpl",
  verbose: read("extensions.@param-dump.sdk.output.logLevel") === "verbose",

  sdkPath: read("extensions.modules.@param-dump.path."),
};

console.log("PARAMS DUMP START" + JSON.stringify(params).trim() + "PARAMS DUMP END");
exit();
