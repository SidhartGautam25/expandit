const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "react-native") {
    return {
      StyleSheet: { create: (styles) => styles },
      Platform: {
        OS: "android",
        select: (obj) => obj.android || obj.default || obj.ios,
      },
      Text: () => null,
      View: () => null,
    };
  }
  return originalRequire.apply(this, arguments);
};
