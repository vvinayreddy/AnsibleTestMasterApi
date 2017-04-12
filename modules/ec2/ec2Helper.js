var awsCredentials = require('local/config/aws').awsCredentials;
var async = require('async');
var logger = require('log4js').getLogger('ec2Helper');
var awsClientLib = require('modules/ec2Instance/ec2Client');
var awsClient = new awsClientLib();

// authenticate aws credentials
function createInstances(instanceInfo, cb) {
    awsClient.init({
        key: awsCredentials.accessKeyId,
        secret: awsCredentials.secretAccessKey,
        region: "us-west-2"
    }, function (err, data) {
        if (!err) {
            launchInstance(instanceInfo, cb)
        } else {
            logger.error(err);
            cb(err);
        }

    })
}

// Create the instance and callback instance details
function launchInstance(instanceParams, launchCallback) {
    var resource = {
        image: {
            id: instanceParams.ImageId
        },
        instanceSize: {
            flavorCode: instanceParams.InstanceType
        },
        keyPair: instanceParams.KeyName,
        securityGroups: instanceParams.securityGroupsName,
        Tags: [{
            "Key": "Name",
            "Value": instanceParams.instanceName
        }]

    }
    awsClient.create(resource, function (err, createResponse) {
        if (err) {
            logger.error('error launching instance', err.message);
            launchCallback(err);
        }
        else {
            awsClient.waitForStatusReturnInstanceInfo(
                createResponse[0].providerInstanceInfo.InstanceId, resource, 'instanceStatusOk', true, function (err, describeResponse) {

                    logger.debug('describeResponse', describeResponse);
                    launchCallback(undefined, describeResponse)
                });

        }


    });
}



module.exports.createInstances = createInstances;