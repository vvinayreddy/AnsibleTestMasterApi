
var Docker = require('dockerode');


function launchContainer(containerDef,callback){
   docker= initDocker(containerDef);
   docker.createContainer({
  Image: 'ubuntu',
  AttachStdin: false,
  AttachStdout: true,
  AttachStderr: true,
  Tty: true,
  Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
  OpenStdin: false,
  StdinOnce: false
}).then(function(container) {
  return container.start();
}).then(function(container) {
  return container.resize({
    h: process.stdout.rows,
    w: process.stdout.columns
  });
}).then(function(container) {
  return container.stop();
}).then(function(container) {
  return container.remove();
}).then(function(data) {
  console.log('container removed');
}).catch(function(err) {
  console.log(err);
});


}

function initDocker(info){
var docker = new Docker({
  host: '192.168.1.10',
  port: process.env.DOCKER_PORT || 2375,
  ca: fs.readFileSync('ca.pem'),
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem'),
  version: 'v1.25' // required when Docker >= v1.13, https://docs.docker.com/engine/api/version-history/ 
});
return docker;

}
module.exports.launchContainer=launchContainer;
