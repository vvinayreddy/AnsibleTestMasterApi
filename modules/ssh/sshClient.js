var Client = require('ssh2').Client;
var util = require('util');
var logger = require('log4js').getLogger();
var fs = require('fs');
var ObjectID = require("bson-objectid");

function sshClient() {
    this.client = undefined;


    return {
        connect: function (connInfo, connectCallback) {
            var _thisRef = this;
            _thisRef.client = new Client();

            // check if the key exists
            /*  if (connInfo.privateKey) {
                  if (!fs.existsSync(connInfo.privateKey)) {
                      connectCallback(new Error('File:' + connInfo.privateKey + ' Does not exists'));
                      return;
                  }
              } */
            _thisRef.client.on('ready', function () {
                    logger.debug('Client :: ready');
                    connectCallback(undefined, _thisRef)
                })
                .on('error', function (err) {
                    if (err)
                        logger.error("Error connecting to remote host", err.message)
                    connectCallback(err)
                })
                .connect({
                    host: connInfo.host,
                    port: connInfo.port,
                    username: connInfo.username,
                    privateKey: connInfo.privateKey ? connInfo.privateKey : undefined,
                    password: connInfo.password ? connInfo.password : undefined
                })

        },
        disconnect: function (disconnectCallback) {
            this.client.end();
            if (disconnectCallback)
                disconnectCallback(undefined, true);
        },
        copyFile: function (fileInfo, copyFileCallback) {
            logger.debug('copyScriptToRemote:');
            var _thisRef = this;

            _thisRef.client.sftp(function (err, sftp) {
                if (err) {
                    logger.error('error opeing sftp connection to remote host', err);
                    copyFileCallback(err);
                    return;
                }
                sftp.fastPut(fileInfo.localFile, fileInfo.remoteFile, function (err, res) {
                    if (err) {
                        logger.error('error transferring script to remote host', err);
                        copyFileCallback(err)
                        return;
                    }
                    if (fileInfo.isExecutable) {
                        _thisRef.client.exec('chmod 700 ' + fileInfo.remoteFile, function (err, stream) {
                            if (err) throw err;
                            stream.on('close', function (code, signal) {
                                logger.debug('Stream chmod:: close :: ', code);
                                copyFileCallback(undefined, _thisRef)
                            }).on('data', function (data) {
                                logger.debug('STDOUT chmod: ', data);
                            }).stderr.on('data', function (data) {
                                logger.debug('STDERR chmod: ', data);
                                copyFileCallback(new Error('STDERR:' + data));
                            });
                        })
                    } else {
                        copyFileCallback(undefined, _thisRef)
                    }
                });
            });
        },
        executeCommand: function (commandObj, execCommandCallback) {
            logger.debug('Executing Command:', commandObj);
            var commandOut = {
                statusCode: undefined,
                data: []
            }
            var _thisRef = this;

            _thisRef.client.exec(commandObj.remoteCommand, {
                pty: true
            }, function (err, stream) {
                if (err) {
                    logger.error('error executing script to remote host', err.message);
                    execCommandCallback(err);
                    return;
                }



                // stream.authPassword(commandObj.username, commandObj.password);
                stream.on('close', function (code, signal) {
                    logger.debug('Stream executeCommand:: close Code:: ', code);
                    commandOut.statusCode = code;
                    commandOut.data = commandOut.data ? commandOut.data.toString() : '';
                    execCommandCallback(undefined, commandOut);
                }).on('data', function (data) {
                    var strThis = this;
                    //logger.debug('STDOUT executeCommand: ', data.toString());
                    //var userPassword
                    if (commandObj.elevatedPrivelage && data.toString().indexOf(util.format('password for %s',commandObj.username)) > -1) {
                        logger.debug('Password prompt for user:',commandObj.username)
                        stream.write(commandObj.password + '\r');
                    } else 
                       commandOut.data.push(data.toString());


                }).stderr.on('data', function (data) {
                    commandOut.data.push(data.toString());
                //    logger.debug('STDERR executeCommand: ', data.toString());
                });
            });
        },
        executeScript: function (fileInfo, executeScriptCallback) {
            var _that = this;

            if (!fileInfo.localFile) {
                if (fileInfo.scriptContent) {
                    if (!fs.existsSync('local')) {
                        fs.mkdirSync('local');
                    }
                    if (!fs.existsSync('local/scripts')) {
                        fs.mkdirSync('local/scripts');
                    }

                    var fileId = new ObjectID().toString();
                    fileInfo.localFile = util.format('local/scripts/%s.sh', fileId);
                    fs.writeFileSync(fileInfo.localFile, fileInfo.scriptContent);
                    if (!fileInfo.remoteFile) {
                        fileInfo.remoteFile = util.format('/tmp/%s.sh', fileId);
                    }

                } else {
                    executeScriptCallback(new Error('localFile  or scriptContent should exist in json'));
                }
            }
            if (!fileInfo.remoteFile) {
                fileInfo.remoteFile = util.format('/tmp/%s.sh', new ObjectID().toString());
            }

            this.copyFile(fileInfo, function (err, client) {
                if (err) {
                    logger.error('error  copying script to remote host', err.message);
                    executeScriptCallback(err);
                    return;
                }
                var command = '';
                if (fileInfo.elevatedPrivelage)
                    command += 'sudo ';

                command += fileInfo.remoteFile;

                if (fileInfo.arguments)
                    command += ' ' + fileInfo.arguments

                _that.executeCommand({
                    remoteCommand: command,
                    username: fileInfo.username,
                    password: fileInfo.password,
                    elevatedPrivelage: fileInfo.elevatedPrivelage
                }, function (err, commandOut) {
                    if (err) {
                        logger.error('error  executing the script', err.message);
                        executeScriptCallback(err);
                        return;
                    }
                    // delete the file from the host
                    _that.executeCommand({
                        remoteCommand: 'rm ' + fileInfo.remoteFile
                    }, function (err, out) {
                        if (err) {
                            logger.error('error  removing the script', err.message);
                            executeScriptCallback(err);
                            return;
                        }
                        if (out.statusCode === 0)
                            executeScriptCallback(undefined, commandOut)
                        else
                            executeScriptCallback(new Error('Non succesful return code:' + out.statusCode, JSON.stringify(out)))
                    });

                });
            })
        },
        connectAndExecuteScript: function (execScriptInfo, executeScriptCallback) {
            var _that = this;
            this.connect(execScriptInfo, function (err, conn) {
                if (err) {
                    logger.error('Error Connecting to host:', err.message)
                    executeScriptCallback(err);
                    return
                }
                logger.debug('Connection Status: Success')
                if (conn) {
                    _that.executeScript(execScriptInfo, function (err, commandOut) {
                        if (err) {
                            logger.error('Error executing script on Host:', execScriptInfo.host, err.message)
                            _that.disconnect();
                            executeScriptCallback(err);
                            return;
                        } else {
                            logger.trace('commandOut:', JSON.stringify(commandOut));
                            _that.disconnect();
                            executeScriptCallback(undefined, commandOut);
                        }
                    });
                } else {
                    logger.debug('Connection Status: Failed')
                    executeScriptCallback(new Error('Connection Object is Null', execScriptInfo));
                }
            })
        },
        connectAndExecuteCommand: function (execScriptInfo, executeScriptCallback) {
            var _that = this;
            this.connect(execScriptInfo, function (err, conn) {
                if (err) {
                    logger.error('Error Connecting to host:', err.message)
                    executeScriptCallback(err);
                    return
                }
                logger.debug('Connection Status: Success')
                if (conn) {
                    var command = '';

                    if (execScriptInfo.elevatedPrivelage)
                        command += 'sudo ';

                    command += execScriptInfo.command;

                    if (execScriptInfo.arguments)
                        command += ' ' + execScriptInfo.arguments


                    _that.executeCommand({
                        remoteCommand: command,
                        username: execScriptInfo.username,
                        password: execScriptInfo.password,
                        elevatedPrivelage: execScriptInfo.elevatedPrivelage
                    }, function (err, commandOut) {
                        if (err) {
                            logger.error('Error executing command on Host:', execScriptInfo.host, err.message)
                            _that.disconnect();
                            executeScriptCallback(err);
                            return;
                        } else {
                            logger.trace('commandOut:', JSON.stringify(commandOut));
                            _that.disconnect();
                            executeScriptCallback(undefined, commandOut);
                        }
                    });
                } else {
                    logger.debug('Connection Status: Failed')
                    executeScriptCallback(new Error('Connection Object is Null', execScriptInfo));
                }
            })
        }
    }


}

module.exports = sshClient;