const { debugLog, username, password } = require("./utils.js");

// Authentication Module
function authCallback(ctx) {
  switch (ctx.method) {
    case "none":
      debugLog("auth type: none, user", ctx.username);
      ctx.reject(["password"]);
      break;
    case "password":
      debugLog("auth type: password, user", ctx.username);
      if (ctx.username === username && ctx.password === password) {
        ctx.accept();
      } else {
        ctx.reject(["password"]);
      }
      break;
    default:
      debugLog("auth type is not recognized, reject");
      ctx.reject();
  }
}

module.exports = {
  authCallback,
};
