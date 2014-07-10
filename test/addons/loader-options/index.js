const { Cc, Ci } = require("chrome");
const { metadata } = require("@loader/options");
const { quit, eForceQuit } = Cc['@mozilla.org/toolkit/app-startup;1'].
                             getService(Ci.nsIAppStartup);

for (let k in metadata) {
  console.log("@loader/options:" + k + ":" + metadata[k]);
}

quit(eForceQuit);
