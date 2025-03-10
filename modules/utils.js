const debugFlag = true;
const fs = require("fs");
const path = require("path");
const globalPath = "<HOME PATH>"; //<==== This needs to be set to HOME directory of SFTP server
const username = "sftpuser";
const password = "sftpuser";
const fsConst = {
  S_IRUSR: 0o400, // user read
  S_IWUSR: 0o200, // user write
  S_IXUSR: 0o100, // user execute
  S_IRGRP: 0o040, // group read
  S_IWGRP: 0o020, // group write
  S_IXGRP: 0o010, // group execute
  S_IROTH: 0o004, // Other read
  S_IWOTH: 0o002, // Other write
  S_IXOTH: 0o001, // Other execute
  S_ISUID: 0o4000, // super Bit for user
  S_ISGID: 0o2000, // super Bit for group
  S_ISVTX: 0o1000, // Sticky Bit
  S_IFREG: 0o100000, // regular file
};

function debugLog() {
  if (debugFlag) {
    console.log("DEBUG [", new Date(), "]", ...arguments);
  }
}

// Configuration of SFTP server
const srvCfg = {
  //debug: debugLog,
  banner: "Welcome to the secret service server (3S) :-)",
  ident: "SSH2.0-Node.JS.Srv",
  hostKeys: [fs.readFileSync(path.join(__dirname, "../host.key"))],
};

module.exports = {
  debugLog,
  globalPath,
  srvCfg,
  username,
  password,
};