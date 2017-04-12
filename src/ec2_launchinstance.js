// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config/aws.json');

// Create EC2 service object
var ec2 = new AWS.EC2({
    apiVersion: '2016-11-15'
});

var instanceInfo = require('data/awsInstanceInfo.json')

console.log('Instance Info',instanceInfo) ;

// read this to understand how arrays and function work in Nodejs
// http://book.mixu.net/node/ch5.html


//1. Check if Key Pair exists, if not create Key Pair


// 2. Check if Security Group Exists, if not create


// 3. check if instance exists, if not create it


 async.waterfall([
        createInstance(req),
        installDocker,
        launchDocker
    ], function (error, success) {
        if (error) { alert('Something is wrong!'); }
        return alert('Done!');
    });