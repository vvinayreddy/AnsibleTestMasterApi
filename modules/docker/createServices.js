var request = require('request');

var fs = require('fs')
    
///////////............create a services....///////////////////
function createService(config,instanceIp,callback) {
 var serviceUrl = "https://"+instanceIp+":2376/services/create" 
console.log("this is config file--->",config);
    request({
        url: serviceUrl,
  //  cert: fs.readFileSync("/home/keys/cert.pem"),
    key: fs.readFileSync(config.containers[0].key),
    ca: fs.readFileSync(config.containers[0].cakey),
    rejectUnauthorized: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        json: true,
        body: {
            "Name": config.containers[0].Name,
            "TaskTemplate": {
                "ContainerSpec": {
                    "Image": config.containers[0].Image,
                    "Mounts": [
                        {
                            "ReadOnly": true,
                            "Source": "web-data",
                            "Target": "/usr/share/nginx/html",
                            "Type": "volume",
                            "VolumeOptions": {
                                "DriverConfig": {
                                },
                                "Labels": {
                                    "com.example.something": "something-value"
                                }
                            }
                        }
                    ],
                    "User": "root"
                },
                "Placement": {
                    "Constraints": [
                        "node.role == worker"
                    ]
                },
                "Resources": {
                    "Limits": {
                        "MemoryBytes": config.containers[0].MemoryBytes
                    },
                    "Reservations": {
                    }
                },
                "RestartPolicy": {
                    "Condition": "on-failure",
                    "Delay": 10000000000,
                    "MaxAttempts": 10
                }
            },
            "Mode": {
                "Replicated": {
                    "Replicas": config.containers[0].Replicas
                }
            },
            "UpdateConfig": {
                "Delay": 30000000000,
                "Parallelism": 1,
                "FailureAction": "pause"
            },
            "EndpointSpec": {
                "Ports": [
                    {
                        "Protocol": "tcp",
                        "PublishedPort": config.containers[0].PublishedPort,
                        "TargetPort": config.containers[0].TargetPort
                    }
                ]
            }

        }
    }, function (error, response, body) {

        //    console.log("body --->", body);
        //    console.log("error --->", error);
        //    console.log('reponse -------------->',response.statusCode);
        callback(undefined, body);
    }

    )

}



module.exports.createService = createService;


