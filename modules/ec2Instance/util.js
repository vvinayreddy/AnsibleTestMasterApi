var createEc2 = require('modules/ec2Instance/createEc2');

function gettingEc2Ip(instanceInfo, Ipcallback) {
    createEc2.createInstances(instanceInfo, handleResult)


    function handleResult(err, data) {
        if (err) {
            console.log("failed to launch instance", err)
        }
        else {
            console.log("sucessfully created instance", data);


            createEc2.getListOfIps(data, finalResult);

            function finalResult(err, finalData) {

                // console.log("this is the file for the location",fileName);
                if (err) {
                    console.error("failed to get list of ips", err)
                } else {
                    console.log("sucessfully created list of ips", finalData);
                    Ipcallback(undefined, finalData);
                    /*    createEc2.createHostFile(fileName,finalData, result);
        
                        function result(err, finalIp) {
                            if (err) {
                                console.error("failed to get master IP -->", err)
                            } else {
                                console.log("master Ip is --->", finalIp);
                                callback(undefined,finalIp.toString())
                            }
                        }
        */



                }
            }


        }
    }

}





module.exports.gettingEc2Ip = gettingEc2Ip;