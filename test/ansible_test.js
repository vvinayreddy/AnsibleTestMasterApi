 var ansibleClient = require('modules/ansible/ansibleClient')();
 var logger = require('log4js').getLogger();

logger.setLevel('DEBUG');

var testData =  {
    "host": "34.208.56.196",
    "port": 22,
    "username": "ubuntu",
    "elevatedPrivelage": true,
    "localFile": "./local/playbooks/nodejs.yml",
    "keyFile": "./local/keys/centkey"
}

var test1 =  {
    "host": "34.208.56.196",
    "port": 22,
    "username": "ubuntu",
    "elevatedPrivelage": true,
    "scriptContent":"---\n- hosts: all\n  become: yes\n  become_method: sudo\n  become_user: root\n  vars: \n    version: 4.7.3\n  roles:\n    - nodejs",
}


 ansibleClient.executePlaybook(test1, function (err, commandOut) {
     if (err) {
         logger.error('Error executing playbook:', err.message)
         return
     }
     logger.info('commandOut:', JSON.stringify(commandOut));  
 })