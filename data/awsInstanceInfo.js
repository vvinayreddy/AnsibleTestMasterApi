module.exports.config={
    "access": {
        "user": "ubuntu",
        "keypair": {
            "name": "awskey",
            "privateKey": "enter you key here"
        }
    },
    
    "instanceDef": {
    "ImageId": "ami-5e63d13e", // amzn-ami-2011.09.1.x86_64-ebs
    "InstanceType": "t2.micro",
    "MinCount": "1",
    "SecurityGroupIds": ["securityGroupId"],
    "KeyName": "Keyname",
    "MaxCount": "1",
    "SubnetId": "ur Subnetid",
   
    },
    
    "playbooks": [
        {
            "name":"install docker",
            "localFile": "data/installswarm.yml",
            
           "content":"---\n- name: master_instance\n  hosts: master\n  remote_user: ubuntu\n  become: yes\n  become_method: sudo\n  become_user: root\n  roles:\n   - dockerSwarmMaster\n- name: slave-node\n  remote_user: ubuntu\n  hosts: slaves\n  become: yes\n  become_method: sudo\n  become_user: root\n  roles:\n    - dockerSwarmSlave",
            "vars":{
                "ca_pem": "/home/keys/ca.pem",
                "ca_key": "/home/keys/ca-key.pem"
            }
        }
    ],
    "containers":[
        {
                "Name": "nginx",
                "Image": "vinayreddy/nginx",
                "RepoTag":"latest",
                "Replicas": 3,
                "PublishedPort": 80,
                "TargetPort": 80,
                "MemoryBytes": 104857600,
                "cakey": "/home/keys/ca.pem",
                "key": "/home/keys/key.pem",
                "cert": "/home/keys/cert.pem"
              
            }
    ]
   
}
