// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config/aws.json');

// Create EC2 service object
var ec2 = new AWS.EC2({
    apiVersion: '2016-11-15'
});

var params = {
    ImageId: 'ami-1e299d7e', // amzn-ami-2011.09.1.x86_64-ebs
    InstanceType: 't2.micro',
    MinCount: 1,
    SecurityGroupIds: [ 'xx'],
    KeyName: 'KP',
    MaxCount: 1,   
    SubnetId: 'subnet-xxx'

};

// Create the instance
ec2.runInstances(params, function (err, data) {
    if (err) {
        console.log("Could not create instance", err);
        return;
    }
    var instanceId = data.Instances[0].InstanceId;
    console.log("Created instance", instanceId);
    // Add tags to the instance
    params = {
        Resources: [instanceId],
        Tags: [{
            Key: 'Name',
            Value: 'SDK Sample'
        }]
    };
    ec2.createTags(params, function (err) {
        console.log("Tagging instance", err ? "failure" : "success");
    });
});