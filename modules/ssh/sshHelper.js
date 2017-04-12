var async = require('async');
var logger = require('log4js').getLogger('sshHelper');
var config = require('data/playbookTestManifest').config;
var sshClient = require('stackdc-library').sshClient();
var csvWriter = require('csv-write-stream')
var writer = csvWriter();
var fs = require('fs');

// testing Playboook installation
function testPlaybook(instanceList, testPlaybookCallback) {

    async.mapSeries(instanceList, function (instance, instanceCallback) {

        async.mapSeries(config.TestCases[0].validation, function (validationItem, validationCallback) {
            logger.debug('host value', instance.details)
            var sshConf = {
                "host": instance.details.ipAddress,
                "port": 22,
                "username": instance.adminUser,
                "isExecutable": true,
                "taskName": "test_script",
                "command": validationItem.data.command,
                "elevatedPrivelage": false,
                "keyFile": "./local/keys/centkey"
            }

            sshClient.connectAndExecuteCommand(sshConf, function (err, commandOut) {
                if (err) {
                    logger.error('Error Connecting to host:', err.message)
                    validationCallback(err)
                } else {
                    logger.info('commandOut:', JSON.stringify(commandOut));
                    var playbookResult = commandOut.data;
                    if (playbookResult.indexOf(validationItem.data.result) >= 0) {
                        console.log("playbook has installed sucessfully");
                        // writing test results to a file
                        var writer = csvWriter({ headers: ["InstanceId", "playbook", "command", "output","result"] });
                        writer.pipe(fs.createWriteStream('data/testResult.csv', { flags: 'a' }))
                        writer.write([instance.details.providerInstanceInfo.InstanceId, config.TestCases[0].name, validationItem.data.command, playbookResult, "sucess"])
                        writer.end()
                        validationCallback(undefined, commandOut)
                    }
                    else {
                        console.log("error installing playbook..!")
                        var writer = csvWriter({ headers: ["InstanceId", "playbook", "command", "output","result"] });
                        writer.pipe(fs.createWriteStream('data/testResult.csv', { flags: 'a' }))
                        writer.write([instance.details.providerInstanceInfo.InstanceId, config.TestCases[0].name, validationItem.data.command, playbookResult, "failed"])
                        writer.end()
                    }

                }
            })
        },
            function (err, validationResponse) {
                logger.info('Completed testing playbooks')
                if (err) {
                    logger.error('Error testing playbook', err.message);
                    instanceCallback(err);
                }
                else {

                    instanceCallback(undefined, validationResponse)

                }
            });

    }, function (err, installListCallBack) {
        if (err) {
            logger.error("Error ", err.message);
            testPlaybookCallback(err);
        } else {
            testPlaybookCallback(undefined, "success");
        }
    })
}

module.exports.testPlaybook = testPlaybook;