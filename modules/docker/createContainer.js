var Docker = require('dockerode');

var logger = require('log4js').getLogger('launchinstance');


function getImage(docker,image,callback) {
    
  //followProgress(stream, onFinished, [onProgress]) 
docker.pull(image, function(err, stream) {
  
  docker.modem.followProgress(stream, onFinished, onProgress);
 
         function onFinished(err, output) {
             if(!err){
               logger.debug('Image pull completed')
                callback(undefined,"sucess");
             }else{
                 callback(err)
             }
    
  }
  function onProgress(event) {
         logger.debug('.')

  }
  
});
    
   
 
}

function startContainer(docker,config,callback){
    
console.log("this is the image name passing to container",config.containers[0].Image)
  
    docker.createContainer(
        {
            Image:      config.containers[0].Image,
            RepoTag:     config.containers[0].RepoTag, 
            Cmd:         config.containers[0].Cmd, 
            name:        config.containers[0].Name,
            PortBindings: config.containers[0].PortBindings,
            ExposedPorts: config.containers[0].ExposedPorts,
            AttachStdin:  config.containers[0].AttachStdin,
            AttachStdout: config.containers[0].AttachStdout,
            AttachStderr: config.containers[0].AttachStderr,
            Tty:          config.containers[0].Tty,
            OpenStdin:    config.containers[0].OpenStdin,
            StdinOnce:    config.containers[0].StdinOnce
        
        } , function (err, container) {
        if(!err){
        //    logger.debug("create container error",err);
        
            container.start(function (err, data) {
    
               // logger.debug("data is ",data,"error is",err);
                 callback(undefined,"success");
  });
        }else{
            logger.error("we got an error, error is ---> ",err);
        }
  
});
           
}


module.exports.getImage = getImage;
module.exports.startContainer = startContainer;