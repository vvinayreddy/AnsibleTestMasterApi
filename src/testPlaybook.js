var async = require('async');
var logger = require('log4js').getLogger('testPlaybook');
var config = require('data/playbookTestManifest').config;
var ec2 = require('modules/ec2/ec2Helper');
var terminateInstance = require('modules/ec2/terminateInstance')
var playbookLib = require('modules/ansible/ansiblePlaybook');
var sshClient = require('stackdc-library').sshClient();
var playbooktestLib = require('modules/ssh/sshHelper');

// async waterfall method for testing playbooks
async.waterfall([
    createInstance,
    installPlaybook,
    testingPlaybook,
    terminateInstances


], function (error, success) {
    if (error) {
        logger.error('Something is wrong!');
    } else {
        return logger.debug('Done!');
    }
});

// create an instance in amazon aws
function createInstance(createInstanceCallback) {

    async.map(config.TestCases[0].instances, function (instance, instanceCallback) {
        ec2.createInstances(instance, function (err, instanceDetails) {
            if (err)
                instanceCallback(err);
            else {
                instance.details = instanceDetails;
                instanceCallback(undefined, instance)
            }
        });

    }, function (err, ec2instances) {

        if (err) {
            logger.error("Error create instances", err.message)
        }
        else {
            //  logger.debug("Instance created", ec2instances);
            createInstanceCallback(undefined, ec2instances)
        }
    });

}

// Install user specified playbook
function installPlaybook(instanceList, installPlaybookCallback) {

    async.mapSeries(instanceList, function (instance, instanceCallback) {

        async.mapSeries(config.TestCases[0].playbooks, function (playbook, playbookCallBack) {

            var playbookConfig = {
                "host": instance.details.ipAddress,
                "port": 22,
                "username": instance.adminUser,
                "elevatedPrivelage": true,
                "debug": true,
                "localFile": playbook.localFile,
                "privateKey": config.access.keypair.privateKey,
                "vars": playbook.vars
            }
            playbookLib.runPlaybook(playbookConfig, function (error, body) {
                if (!error) {
                    logger.debug('Playbook executing result', body)
                    playbook.response = body
                    playbookCallBack(undefined, body)
                }
                else {
                    logger.error('Error Executing Playbook ', error)
                    playbookCallBack(error)
                }
            });
        },
            function (err, playbookResponse) {
                logger.info('Completed Installing playbooks')
                if (err) {
                    logger.error('Error running playbook', err.message);
                    instanceCallback(err);
                }
                else {
                    instanceCallback(err, instanceList, config)

                }
            });

    }, function (err, instanceListCallback) {
        if (err) {
            logger.error('Error instancelist ', err.message);
            installPlaybookCallback(err);
        } else {
            logger.debug("instance list callback", instanceListCallback);
            installPlaybookCallback(undefined, instanceList);
        }
    })
}

// Testing playbook
function testingPlaybook(instanceList, testingPlaybookCallback) {

    logger.debug("testPlaybook instanceList:", instanceList.details);

    // logger.debug("testPlaybook config ", temp)

    playbooktestLib.testPlaybook(instanceList, handleResult);

    function handleResult(error, data) {

        if (error) {
            console.log("testing playbook failed");
        } else {
            console.log("installed playbook sucess!");
            testingPlaybookCallback(undefined, instanceList);
        }
    }

}

// termiante Instances
function terminateInstances(instanceList, terminateInstanceCallback) {
    terminateInstance.terminateEc2(instanceList, function (err, data) {
        if (err) {
            logger.error(err)
            terminateInstanceCallback(err);
        } else {
            logger.debug("sucess Done")
            terminateInstanceCallback(undefined, "sucess");
        }
    });


}


