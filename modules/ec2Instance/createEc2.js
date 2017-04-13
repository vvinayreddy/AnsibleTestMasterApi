
var async = require('async');
var logger = require('log4js').getLogger('launchinstance');
var awsClientLib = require('modules/ec2Instance/ec2Client');
var awsClient = new awsClientLib();
/*
// Create EC2 service object
var ec2 = new AWS.EC2({
    apiVersion: '2016-11-15'
});
*/

function createInstances(instanceInfo, cb) {

    awsClient.init({
        key: "",
        secret: "",
        region: "us-west-2"
    }, function (err, data) {
        if (!err) {
            console.log("config data -->", data);
            async.map(instanceInfo, createEc2, function (err, data) {
                if (!err) {
                    cb(undefined, data);
                }
                else {
                    cb(err);
                }
            });
        } else {
            logger.error(err);
        }

    })



}

// Create the instance
function createEc2(instanceParams, ec2Callback) {
    var listOfInstanceId = [];

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

    awsClient.create(resource, hadlerResult);
    function hadlerResult(err, data) {

        //  console.log("data is --->", data[0].providerInstanceInfo.InstanceId)

        data.forEach(function (element) {
            listOfInstanceId.push(element.providerInstanceInfo.InstanceId);
        })


        awsClient.waitforInstanceOk([data[0].providerInstanceInfo.InstanceId], function (error, waitResult) {
            if (error) {
                console.log("waitResult error is", error);


            } else {
                // console.log("waitResult is ----> ", waitResult);
                ec2Callback(undefined, listOfInstanceId);


            }
        })
    }


}





function getListOfIps(listOfInstanceId, cb) {
    console.log("this is from get  list of instance id's--->", listOfInstanceId);
    async.map(listOfInstanceId, getIp, function (err, data) {
        if (!err) {
            cb(undefined, data);
        } else {
            cb(undefined, err);
        }
    });
}

function getIp(instanceId, callback) {

    console.log("this is from get instance id--->", instanceId);
    // instanceId = instanceId.toString();
    var listOfIps = [];

    awsClient.describeInstances(instanceId, descrbeInstanceResult);
    instanceId = instanceId.toString();
    function descrbeInstanceResult(error, describeInstancesData) {
        if (error) {
            console.log("descrbeInstanceError is", error);
        } else {
            // console.log("Data is --->", describeInstancesData);

            describeInstancesData.Reservations.forEach(function (element) {
                element.Instances.forEach(function (element2) {
                    console.log("comparing " + element2.InstanceId + " with our instances ids " + instanceId);

                    if (element2.InstanceId === instanceId) {
                        console.log("Ipaddress of the instance created--->", element2.PublicIpAddress)
                        listOfIps.push(element2.PublicIpAddress)
                        callback(undefined, listOfIps);

                    } else {
                        console.log("comparsion error");
                        callback(undefined, listOfIps);
                    }


                })

            });

        }
    }
}






module.exports.getListOfIps = getListOfIps;
module.exports.createInstances = createInstances;