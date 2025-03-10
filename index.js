'use strict';

const { Server } = require("ssh2");
const { debugLog, srvCfg } = require('./modules/utils.js');
const { srvCallback } = require('./modules/sshSrv.js');

const server = new Server(srvCfg, srvCallback).listen(22, "0.0.0.0", () => {
  debugLog("SSH server started on port", server.address().port);
});