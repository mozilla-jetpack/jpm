const { Cc, Ci } = require("chrome");
const { quit, eForceQuit } = Cc["@mozilla.org/toolkit/app-startup;1"].
                             getService(Ci.nsIAppStartup);

console.log("overloadable addon running");

quit(eForceQuit);
