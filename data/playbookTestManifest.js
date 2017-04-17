module.exports.config = {
    "access": {
        "user": "ec2-user",
        "keypair": {
            "name": "awskey",
            "privateKey": "your private key"
        }
    },
    "TestCases": [{
        "name": "Test Java Ansible Roles in Ubuntu and Centos",
        "playbooks": [
            {
                "name": "install open-jdk",
                "localFile": "data/open-jdk.yml",
                "vars": {
                    "java_install_dir": "/usr/lib/jvm",
                    "java_tar_ball": "http://www.java.net/download/jdk8u60/archive/b17/binaries/jdk-8u60-ea-bin-b17-linux-x64-26_may_2015.tar.gz",
                    "java_version": "8.0",
                    "java_sub_version": "60"
                }
            }
        ],
        "instances": [
            {
                "ImageId": "ami-6f68cf0f", // amzn-ami-2011.09.1.x86_64-ebs
                "InstanceType": "t2.micro",
                "MinCount": "1",
                "SecurityGroupIds": ["securityGroupId"],
                "KeyName": "keyname",
                "MaxCount": "1",
                "securityGroupsName": ['my-security-group'],
                "SubnetId": "mysubbnetId",
                "instanceName": "redhat",
                "adminUser": "ec2-user"
               
            },
            {
                "ImageId": "ami-5e63d13e", // amzn-ami-2011.09.1.x86_64-ebs
                "InstanceType": "t2.micro",
                "MinCount": "1",
                "SecurityGroupIds": ["securityGroupId"],
                "KeyName": "keyname",
                "MaxCount": "1",
                "securityGroupsName": ['my-security-group'],
                "SubnetId": "mysubnetid",
                "instanceName": "ubuntu",
                "adminUser": "ubuntu"
               
            }],
        "validation": [
            {
                "type": "ssh",
                "data": {
                    "command": "/usr/lib/jvm/jdk1.8.0_60/bin/java -version",
                    "result": "java version \"1.8.0_60-ea\""
                }
            }
        ]
    }
    ]

}
