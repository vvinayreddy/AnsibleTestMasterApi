var AWS = require('aws-sdk');
var lodash = require('lodash')
var logger = require('log4js').getLogger('ec2Client');
var async = require('async');


function ec2Client() {
  this.config = undefined;
  this.ec2 = undefined;

}

ec2Client.prototype.init = function (config, cb) {
  this.config = config;

  AWS.config.update({
    accessKeyId: config.key,
    secretAccessKey: config.secret,
    region: config.region
  });

  this.ec2 = new AWS.EC2();
  cb(undefined, true);
}

ec2Client.prototype.create = function (resource, createCallback) {
  var _selfRef = this;
   var resourceProperties = resource.properties || {} ;
  var instanceDef = {
    ImageId: resource.image.id,
    MaxCount: 1,
    MinCount: 1,
    BlockDeviceMappings: [{
      DeviceName: '/dev/sda1',
      Ebs: {
        DeleteOnTermination: resourceProperties.DeleteRootDiskOnTermination ? resourceProperties.DeleteRootDiskOnTermination : true,
        VolumeSize: 10
      }
    }],
    InstanceType: resource.instanceSize.flavorCode || 't2.micro',
    SecurityGroups: resource.securityGroups,
    KeyName: resource.keyPair,
    Monitoring: {
      Enabled: (resourceProperties.Monitoring=='true')
    },
    UserData: resource.initScript ? new Buffer(resource.initScript).toString('base64') : undefined
  }
  logger.debug('Creating instance:', instanceDef)
  _selfRef.ec2.runInstances(instanceDef, function (err, instanceData) {
    if (err) {
      logger.error(err);
      createCallback(err, resource)
    }

    async.map(instanceData.Instances, function (instance, mapCallback) {

      _selfRef.ec2.createTags(createTags(instance.InstanceId, resource),
        function (err, tagData) {
          if (err)
            logger.error('Error creating Tag:', err.stack)
          else
            logger.debug('createTag:', tagData); // successful response

          mapCallback(err, buildResourceInfo(resource,instance));
        });
    },
      function (err, resourcesList) {
        createCallback(err, resourcesList)
      });


  });
}
ec2Client.prototype.stopInstances = function (resourceIds, cb) {
  this.ec2.stopInstances({
    InstanceIds: resourceIds
  }, cb)
}

ec2Client.prototype.startInstances = function (resourceIds, cb) {
  this.ec2.startInstances({
    InstanceIds: resourceIds
  }, cb)
}

ec2Client.prototype.terminateInstances = function (instanceIds, cb) {
  this.ec2.terminateInstances({
    InstanceIds: instanceIds
  }, cb)
}


ec2Client.prototype.getSecurityGroup = function (securityGroupData, cb) {
  params = {
    DryRun: false,
    GroupNames: [
      securityGroupData.GroupName
    ]
  };
  this.ec2.describeSecurityGroups(params, cb);
}

ec2Client.prototype.reStartInstances = function (instances, cb) {
  params = {
    InstanceIds: [instances],
    DryRun: false
  };
  this.ec2.rebootInstances(params, cb);
}

ec2Client.prototype.stopInstance = function (resourceId, waitForCompletion, cb) {
  this.ec2.stopInstances({
    InstanceIds: [instanceId]
  }, function (err, instanceData) {
    if (err)
      cb(err)
    else {
      waitForStatusReturnInstanceInfo(instanceId, {}, 'instanceStopped', waitForCompletion, cb);
    }
  });
}

ec2Client.prototype.performOperation = function (instanceId, operationType, waitForCompletion, cb) {
  var _selfRef = this;


  var params = {
    InstanceIds: [instanceId]
  };

  switch (operationType) {
    case "Terminate":
      this.ec2.terminateInstances(params, function (err, instanceData) {
        err ? cb(err) :
          _selfRef.waitForStatusReturnInstanceInfo(instanceId, instanceData, 'instanceTerminated', waitForCompletion, cb);
      });

      break;
    case "Start":
      this.ec2.startInstances(params, function (err, instanceData) {
        err ? cb(err) :
          _selfRef.waitForStatusReturnInstanceInfo(instanceId, instanceData, 'instanceStatusOk', waitForCompletion, cb);
      });
      break;
    case "Stop":
      this.ec2.stopInstances(params, function (err, instanceData) {
        err ? cb(err) :
          _selfRef.waitForStatusReturnInstanceInfo(instanceId, instanceData, 'instanceStopped', waitForCompletion, cb);
      });
      break;
    case "Restart":
      this.ec2.rebootInstances(params, function (err, instanceData) {
        err ? cb(err) :
          _selfRef.waitForStatusReturnInstanceInfo(instanceId, instanceData, 'instanceRunning', waitForCompletion, cb);
      });
      break;
    case "Sync":
      _selfRef.getInstanceInfo(instanceId, {}, cb);
      break;
    default:
      cb(new Error('Unknown Operatation Type: ' + operationType));
  }

}


ec2Client.prototype.startInstance = function (resourceId, waitForCompletion, cb) {
  this.ec2.startInstances({
    InstanceIds: [instanceId]
  }, function (err, instanceData) {
    if (err)
      cb(err)
    else {
      waitForStatusReturnInstanceInfo(instanceId, {}, 'instanceStatusOk', waitForCompletion, cb);
    }
  });
}

ec2Client.prototype.terminateInstance = function (instanceId, waitForCompletion, cb) {
  var _selfRef = this;
  this.ec2.terminateInstances({
    InstanceIds: [instanceId]
  }, function (err, instanceData) {
    if (err)
      cb(err)
    else {
      _selfRef.waitForStatusReturnInstanceInfo(instanceId, {}, 'instanceTerminated', waitForCompletion, cb);
    }
  });
}


ec2Client.prototype.rebootInstance = function (instanceId, waitForCompletion, cb) {
  var _selfRef = this;
  params = {
    InstanceIds: [instanceId],
    DryRun: false
  };
  this.ec2.rebootInstances(params, function (err, instanceData) {
    if (err)
      cb(err)
    else {
      _selfRef.waitForStatusReturnInstanceInfo(instanceId, {}, 'instanceStatusOk', waitForCompletion, cb);
    }
  });

}

ec2Client.prototype.describeInstances = function (instances, cb) {
  params = {
    InstanceIds: instances,
    DryRun: false
  };
  this.ec2.describeInstances(params, cb);
}

ec2Client.prototype.waitForStatusReturnInstanceInfo = function (instanceId, resource, instanceStatus, waitForCompletion, cb) {
  logger.debug('Waiting for Instance State Change', instanceId, instanceStatus)
  var _selfRef = this;
  params = {
    InstanceIds: [instanceId],
    DryRun: false
  };
  if (waitForCompletion) {
    this.ec2.waitFor(instanceStatus, params, function (err, instanceData) {
      logger.debug('Wait Complete for Instance State', instanceId, instanceStatus)
      if (err)
        cb(err)
      else {
        if (instanceData.Reservations)
          cb(undefined, buildResourceInfo(resource, instanceData.Reservations[0].Instances[0]))
        else
          _selfRef.getInstanceInfo(instanceId, resource, cb)
      }
    });
  } else {
    _selfRef.getInstanceInfo(instanceId, resource, cb)
  }


}

ec2Client.prototype.getInstanceInfo = function (instanceId, resource, cb) {
  params = {
    InstanceIds: [instanceId],
    DryRun: false
  };
  this.ec2.describeInstances(params, function (err, instanceData) {
    if (err)
      cb(err)
    else {
      cb(undefined, buildResourceInfo(resource, instanceData.Reservations[0].Instances[0]))
    }
  });
}

ec2Client.prototype.createSecurityGroup = function (securityGroupData, cb) {
  var _selfRef = this;
  var secGroupInfo = {
    Description: securityGroupData.Description,
    GroupName: securityGroupData.GroupName,
    DryRun: false,
    VpcId: securityGroupData.vpcId

  };

  var tagGroup = {
    Resources: [],
    Tags: [{
      Key: "Name",
      Value: securityGroupData.GroupName
    }]
  };

  _selfRef.ec2.describeSecurityGroups({
    DryRun: false,
    GroupNames: [
      securityGroupData.GroupName
    ]
  }, function (err, groupData) {

    if (groupData) // if group exists
    {
      logger.debug('Security Group Exists', securityGroupData.GroupName)
      securityGroupData.GroupId = groupData.SecurityGroups[0].GroupId;
      cb(err, securityGroupData);
    } else {
      logger.debug('Security Group does not Exist, Creating Group', securityGroupData.GroupName)
      _selfRef.ec2.createSecurityGroup(secGroupInfo, function (err, sgResponse) {
        if (err)
          cb(err)
        else {
          tagGroup.Resources.push(sgResponse.GroupId);
          securityGroupData.GroupId = sgResponse.GroupId;

          logger.debug('Tagging SecurityGroup ', securityGroupData.GroupName)

          _selfRef.ec2.createTags(tagGroup, function (err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else console.log(data); // successful response
          });
          cb(err, securityGroupData);
        }
      });
    }

  });
}

ec2Client.prototype.createIngressRules = function (securityGroupData, cb) {
  var _selfRef = this;
  var secGroupIngressRules = {
    GroupName: securityGroupData.GroupName,
    GroupId: securityGroupData.GroupId,
    IpPermissions: securityGroupData.IpPermissions,
    DryRun: false
  };

  logger.debug('Security Group; Creating Rules', secGroupIngressRules)
  _selfRef.ec2.authorizeSecurityGroupIngress(secGroupIngressRules, function (err, data) {
    if (err && err.statusCode != 400) {
      logger.error(err);
      cb(err);
    } else {
      logger.debug('Rule Query:', data || err.statusCode);
      cb(err, secGroupIngressRules)
    }
  });
},
  ec2Client.prototype.createKeyPair = function (keyPairData, cb) {
    var _selfRef = this;
    var keyPairLookup = {
      KeyNames: [
        keyPairData.keyName
      ]
    };
    var kepPairCreateData = {
      KeyName: keyPairData.keyName,
      PublicKeyMaterial: keyPairData.publicKey,
    };
    _selfRef.ec2.describeKeyPairs(keyPairLookup, function (err, kpData) {
      if (kpData) // KP exists
      {
        cb(err, kpData);
      } else {
        _selfRef.ec2.importKeyPair(kepPairCreateData, cb);

      }
    });
  }
ec2Client.prototype.waitforInstanceOk = function (instanceIds, cb) {
  this.ec2.waitFor('instanceStatusOk', {
    InstanceIds: instanceIds
  }, cb)

}
ec2Client.prototype.waitforInstance = function (instanceIds, status, cb) {
  logger.debug('Waiting for instance status', instanceIds, status);
  this.ec2.waitFor(status, {
    InstanceIds: instanceIds
  }, cb)

};

function buildResourceInfo(resource, awsInstance) {

  if (!resource)
    resource = {};

  resource.externalResourceId = awsInstance.InstanceId;
  resource.securityGroups = [];
  resource.launchTime = awsInstance.LaunchTime;
  resource.key = awsInstance.KeyName;
  resource.osArch = awsInstance.Architecture;
  resource.providerStatus = awsInstance.State.Name
  if (!resource.placement)
    resource.placement = {};

  resource.placement.availabilityZone = awsInstance.Placement.AvailabilityZone;
  resource.placement.pool = awsInstance.Placement.Tenancy;

  resource.hostName = awsInstance.PublicDnsName || awsInstance.PrivateDnsName || 'NA';
  resource.ipAddress = awsInstance.PublicIpAddress || awsInstance.PrivateIpAddress || 'NA';
  resource.network = {
    private: {
      ip: awsInstance.PrivateIpAddress,
      hostName: awsInstance.PrivateDnsName
    },
    public: {
      ip: awsInstance.PublicIpAddress,
      hostName: awsInstance.PublicDnsName
    }
  };
  resource.providerInstanceInfo = awsInstance

  awsInstance.SecurityGroups.forEach(function (group) {
    resource.securityGroups.push({
      name: group.GroupName,
      id: group.GroupId
    })
  });

  resource.properties = [{
    name: 'ReservationId',
    value: awsInstance.ReservationId
  }, {
    name: 'Monitoring',
    value: awsInstance.Monitoring.State
  }, {
    name: 'VirtualizationType',
    value: awsInstance.VirtualizationType
  }, {
    name: 'Hypervisor',
    value: awsInstance.Hypervisor
  }, {
    name: 'EbsOptimized',
    value: awsInstance.EbsOptimized
  }]

  return resource;
}



function createTags(InstanceId, resource) {
  return {
    Resources: [InstanceId],
    Tags: resource.Tags
  }
}
module.exports = ec2Client;