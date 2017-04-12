var awsClientLib = require('modules/ec2Instance/ec2Client');
var awsCredentials = require('local/config/aws').awsCredentials;
var awsClient = new awsClientLib();
var async = require('async')
var logger = require('log4js').getLogger('terminateInstance');

// terminating instances
function terminateEc2(instanceList, terminateInstanceCallback) {
    awsClient.init({
        key: awsCredentials.accessKeyId,
        secret: awsCredentials.secretAccessKey,
        region: "us-west-2"
    }, function (err, data) {
        if (!err) {
            console.log("config data -->", data);
            async.map(instanceList, function terminate(instance, terminateCallback) {
               
                awsClient.terminateInstance(instance.details.providerInstanceInfo.InstanceId, 'instanceTerminated', handleResult);
                function handleResult(err, data) {
                    if (err) {
                        logger.debug("termiante instance error", err)
                        terminateCallback(err);
                    } else {
                        logger.debug("instance terminated", data);
                        terminateCallback(undefined, data)
                    }
                }

            }, function (err, data) {
                if (err) {
                    logger.debug("error", err.message)
                    terminateInstanceCallback(err)
                } else {
                    logger.debug("terminated sucessfully", data);
                    terminateInstanceCallback(undefined,"sucess")
                }
            })

        } else {
            logger.error(err);
            cb(err);
        }

    })


}

module.exports.terminateEc2 = terminateEc2;
