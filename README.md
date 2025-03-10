# ssh2srv
A very simple SFTP download server based on @mscdex/ssh2

# How to use

- Install all dependencies:
"npm install"
- Generate Host Key:
"ssh-keygen -t rsa -b 4096 -m PEM -f host.key"
- Modify "modules/utils.js" -> "globalPath" to set it to the home directory of your SFTP server.
NOTE: On windows system, you have to follow the Windows format like: "C:\\\temp\\\sftphome".
- Start the SFTP user with "npm run start"
- Now use any of SFTP client to connect to the host, e.g. sftp sftpuser@localhost
Default User: sftpuser, Password: sftpuser
