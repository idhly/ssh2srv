const { debugLog, globalPath } = require("./utils.js");
const fs = require("fs");
const {
  utils: {
    sftp: { STATUS_CODE },
  },
} = require("ssh2");
const globalDirHandle = Buffer.from("dirHandle");

/* 
  Reference: https://github.com/mscdex/ssh2/blob/master/SFTP.md

  Currently implemented [ REALPATH, OPENDIR, READDIR, STAT, LSTAT, OPEN, CLOSE, READ, RENAME ]
*/

function sftpCallback(accept, reject) {
  debugLog("client is requesting sftp channel");
  let opendirMore = true;

  const sftpChannel = accept(); // create new sftp channel instance

  // Event 'OPEN' handling
  sftpChannel.on("OPEN", (reqId, filename, flags, attrs) => {
    debugLog(`<open> called, id ${reqId} filename ${filename} flags ${flags}`);

    fs.open(globalPath + "/" + filename, (err, handle) => {
      if (err) {
        debugLog(`OPEN failed: ${err.message}`);
        sftpChannel.status(reqId, STATUS_CODE.NO_SUCH_FILE);
      } else {
        const fileHandle = Buffer.alloc(4);
        fileHandle.writeInt8(handle, 0);

        debugLog(`fs.open ${filename} success, handle: ${handle}, buffer: ${fileHandle.toString()}`);
        sftpChannel.handle(reqId, fileHandle);
      }
    });
  });

  // Event 'CLOSE' handling
  sftpChannel.on("CLOSE", (reqId, handle) => {
    debugLog(`<close> called, id(${reqId}) for handle: ${handle}`);

    if (handle.toString() === globalDirHandle.toString()) {
      // This is the dummy handle for home Directory, just return
      sftpChannel.status(reqId, STATUS_CODE.OK);
    } else {
      //Try to close file handle
      fs.close(handle.readInt8(0), (err) => {
        if (err) {
          debugLog("error occurs in closing file handler,", err.message);
          sftpChannel.status(reqId, STATUS_CODE.FAILURE);
        } else {
          sftpChannel.status(reqId, STATUS_CODE.OK);
        }
      });
    }
  });

  // Event 'READ' handling
  sftpChannel.on("READ", (reqId, handle, offset, length) => {
    // 'offset' (in bytes) relative to the beginning of the file
    // 'length' is the maximum number of bytes to read.
    debugLog(
      `<read> called, id(${reqId}) for handle: ${handle} to read ${length} bytes from offset: ${offset}`
    );
    const fileBuffer = Buffer.alloc(length);

    // fs.read(fd, buffer, offset, length, position, callback)
    // fd <integer>
    // buffer <Buffer> | <TypedArray> | <DataView> The buffer that the data will be written to.
    // offset <integer> The position in buffer to write the data to.
    // length <integer> The number of bytes to read.
    // position <integer> | <bigint> | <null> Specifies where to begin reading from in the file. If position is null or -1 , data will be read from the current file position, and the file position will be updated. If position is a non-negative integer, the file position will be unchanged.
    // callback <Function>
    //    err <Error>
    //    bytesRead <integer>
    //    buffer <Buffer>
    fs.read(handle.readInt8(0), fileBuffer, 0, length, null, (err, bytesRead, buffer) => {
        //if (err) throw err;
        if (err) {
          debugLog(`READ failed: ${err}`);
          return sftpChannel.status(reqId, STATUS_CODE.FAILURE);
        }

        if (bytesRead === 0) {
          // file EOF reached, return status code EOF
          debugLog(`fs.read (id: ${reqId}) reads ${bytesRead} bytes. send EOF`);
          sftpChannel.status(reqId, STATUS_CODE.EOF);
        } else {
          /* 
            return read bytes to client
             This is used to demostrate the situation that the chunks are not aligned correctly
             ===> make a unaligned packet <===
          */
          /*if (reqId===100) {
            setTimeout(()=>{
              debugLog(`fs.read (id: ${reqId}) reads ${bytesRead} bytes, send data (delayed)`);
              sftpChannel.data(reqId, buffer.subarray(0, bytesRead));
            },100);
          } else {*/
            debugLog(`fs.read (id: ${reqId}) reads ${bytesRead} bytes, send data`);
            sftpChannel.data(reqId, buffer.subarray(0, bytesRead));
          //}
        }
      }
    );
  });

  // Event 'REALPATH' handling
  sftpChannel.on("REALPATH", (reqId, path) => {
    debugLog(`<realpath> called, id(${reqId}) for ${path}`);

    sftpChannel.name(reqId, [
      {
        filename: path,
        longname: path
      }
    ]);
  });

  // Event 'STAT' handling
  sftpChannel.on("STAT", (reqId, path) => {
    debugLog(`<stat> called, id(${reqId}) for ${path}`);

    fs.stat(globalPath + "/" + path, (err, stats) => {
      if (err) {
        debugLog(`STAT failed: ${err.message}`);
        return sftpChannel.status(reqId, STATUS_CODE.NO_SUCH_FILE);
      }

      sftpChannel.attrs(reqId, {
        mode: stats.mode, //0o100644,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        atime: stats.atime,
        mtime: stats.mtime,
      });
    });
  });

  // Event 'LSTAT' handling
  sftpChannel.on("LSTAT", (reqId, path) => {
    debugLog(`<lstat> called, id(${reqId}) for ${path}`);

    fs.stat(globalPath + "/" + path, (err, stats) => {
      if (err) {
        debugLog(`LSTAT failed: ${err.message}`);
        return sftpChannel.status(reqId, STATUS_CODE.NO_SUCH_FILE);
      }

      sftpChannel.attrs(reqId, {
        mode: stats.mode, //0o100644,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        atime: stats.atime,
        mtime: stats.mtime,
      });
    });
  });

  // Event 'OPENDIR' handling TODO: currently it's a dummy opendir
  sftpChannel.on("OPENDIR", (reqId, path) => {
    debugLog(`<opendir> called, id(${reqId}) for ${path}`);

    sftpChannel.handle(reqId, globalDirHandle);
  });

  // Event 'READDIR' handling TODO: currently return dirents once
  sftpChannel.on("READDIR", (reqId, handle) => {
    debugLog(`<readdir> called, id ${reqId} handle ${handle}`);

    if (handle.toString() == globalDirHandle.toString()) {
      if (opendirMore) {
        fs.readdir(globalPath, { withFileTypes: true }, (err, dirents) => {
          if (err) throw err; //TODO, error handling
          //debugLog('files\n',...dirents);
          opendirMore = false;

          const fileList = [];
          dirents.forEach((dirent) => {
            const stat = fs.statSync(globalPath + "//" + dirent.name);
            const leadingStr = dirent.isDirectory() ? "drw-r--r--" : "-rwxr-xr-x";

            fileList.push({
              filename: dirent.name,
              longname: `${leadingStr} ${stat.uid} ${stat.gid}\t${stat.size}\t${stat.mtime.toGMTString().substring(5, 22)} ${dirent.name}`,
            });
          });
          sftpChannel.name(reqId, fileList);
        });
      } else {
        sftpChannel.status(reqId, STATUS_CODE.EOF);
        opendirMore = true;
      }
    } else {
      debugLog("handler is not matched, ignore");
      sftpChannel.status(reqId, STATUS_CODE.FAILURE);
      opendirMore = true;
    }
  });

  // Event 'RENAME' handling
  sftpChannel.on('RENAME', (reqId, oldPath, newPath)=>{
    debugLog(`<rename> called, id ${reqId} oldpath ${oldPath} newpath ${newPath}`);
    fs.rename(globalPath+ "/" + oldPath, globalPath + "/" + newPath, (err)=>{
      if (err) {
        debugLog('error occurs during "RENAME" operation.', err);
        sftpChannel.status(reqId, STATUS_CODE.FAILURE, err.message);
      } else {
        sftpChannel.status(reqId, STATUS_CODE.OK);
      }
    })
  });
}

module.exports = {
  sftpCallback,
};
