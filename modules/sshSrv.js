const { debugLog } = require("./utils.js");
const { sftpCallback } = require("./sftp.js");
const { authCallback } = require("./auth.js");

// Callback to handle connections of SSH server
function srvCallback(client) {
  debugLog("SSh Client connection starting...");

  // Client request authentication
  client.on("authentication", authCallback);

  // Client authentication done
  client.on("ready", () => {
    debugLog("client is authenticated"); //DEBUG
  });

  // Client request to close
  client.on("close", () => {
    debugLog("Connection 'close' event triggered");
    client.end();
  });

  // Client returns error
  client.on("error", (err) => {
    if (err.code === 'ECONNRESET') {
      debugLog('Connection was reset by the client');
    } else {
      debugLog("Connection 'error' occurs:", err.message);
      client.end();
    }
  });

  // Client wants to end
  client.on("end", () => {
    debugLog("Connection 'end' event triggered");
    client.end();
  });

  // Client request SSH Session (e.g. SFTP)
  client.on("session", (accept, reject) => {
    debugLog("client is requesting session");

    const session = accept(); // create new session instance

    // Client Request SFTP subsystem
    session.on("sftp", sftpCallback);

    // Client session is closed
    session.on("close", () => {
      debugLog("session was closed");
    });

    // Client receive CHANNEL_EOF
    session.on("eof", () => {
      // Base on SSH Connection protocol https://datatracker.ietf.org/doc/html/rfc4254
      // It is not essential to respond EOF back to Client upon receiving SSH_MSG_CHANNEL_EOF.
      debugLog("session eof received");
    });

    // Client receive CHANNEL_CLOSE
    session.on("end", () => {
      // The SSH2 emits both 'eof' and 'end'
      // events upon receiving the CHANNEL_EOF
      debugLog("session end received");
      client.end();
    });

    /* Test events for fun only */
    session.on("exec",(accept, reject, info)=>{
      debugLog('session exec received, info', info);
    });
    session.on("signal",(accept, reject, info)=>{
      debugLog('session signal received, info', info);
    });
    session.on("subsystem",(accept, reject, info)=>{
      debugLog('session subsystem received, info', info);
    });
    session.on("shell",(accept, reject)=>{
      debugLog('session shell received');
    });
    session.on("pty",(accept, reject, info)=>{
      debugLog('session pty received, info', info);
    });
    session.on("env",(accept, reject, info)=>{
      debugLog('session env received, info', info);
    });
    session.on("auth-agent",(accept, reject)=>{
      debugLog('session auth-agent received');
    });
  });

  // OTHER CLIENT EVENTS for FUN
  client.on("handshake", ()=>{
    debugLog("client event 'handshake' triggered");
  });
  client.on("rekey", ()=>{
    debugLog("client event 'rekey' triggered");
  });
  client.on("request", (accept, reject, name, info)=>{
    debugLog("client event 'request' triggered,",name, info);
  });
  client.on("tcpip", (accept, reject, info)=>{
    debugLog("client event 'tcpip' triggered,", info);
  });
}

module.exports = {
    srvCallback
};
