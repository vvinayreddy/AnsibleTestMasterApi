var async = require('async');
var logger = require('log4js').getLogger('launchinstance');
var config = require('data/awsInstanceInfo').config;
var ec2 = require('modules/ec2Instance/getMasterIp');
var Docker = require('dockerode');
var playbookLib = require('modules/ansible/ansiblePlaybook');
var container = require('modules/docker/createContainer');
var services = require('modules/docker/createServices');


//logger.debug(config);

 async.waterfall([
        createInstance,
        installDocker,
        launchService
        
        
    ], function (error, success) {
        if (error) {
            logger.error('Something is wrong!'); 
            }else{
        return logger.debug('Done!');
            }
    });



//////////////////////////////////////////////////////////////////////
// create an instance in amazon aws
function createInstance(callback){
    
    logger.debug('i reached here');
    ec2.getMasterIp(config.instanceDef,handresult);


function handresult(error,body){
if(!error){
       callback(undefined,config,body)
    }
}
}  
/////////////////////////////////////////////////////////////////////////
// Install docker in instance lauched above
function installDocker(config,instanceIp,callback){
    
    
    async.mapSeries(config.playbooks,function(playbook,playbookCallBack){
        
          var playbookConfig =  {
                "hostFile": "./local/hosts/inventory",
                "port": 22,
                 "username": config.access.user,
                "elevatedPrivelage": true,
                 "debug":true,
                "localFile": playbook.localFile,
                 "privateKey": config.access.keypair.privateKey,
                 "vars": playbook.vars
                } 
         playbookLib.runPlaybook(playbookConfig,function(error,body){
             if(!error){
               // logger.debug('Playbook executing result',body)
               playbookCallBack(undefined,body)
                }
             else {
                 logger.error('Error Executing Playbook ',error)
                    playbookCallBack(error)
             }
         });
    },
    function(err, response){
        logger.info('Completed Install Docker method')
        callback(err,instanceIp)
    });
    
 
}   

// launch a container

function launchService(instanceInfo, callback){
   
logger.info("launchService instaceInfo:",instanceInfo);
logger.info("launchService Config ",config)

 
 
 services.createService(config,instanceInfo,
function(error,data){
  if(!error){
        logger.debug("created services in swarm cluster sucessfully and service id:-",data);
         callback(undefined,config,instanceInfo); 
  }else{
        logger.error("error in createservice---> ",error);
         callback(error);
  }
 
}
);

}



   