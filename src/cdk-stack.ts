import * as cdk from '@aws-cdk/core'
import { CustomEnvironment } from './custom-environment'
import { AutoScalingGroup, Monitoring } from '@aws-cdk/aws-autoscaling'
import { InstanceClass, InstanceSize, InstanceType, MachineImage, Port, Peer, SecurityGroup, SubnetType, UserData, Vpc } from '@aws-cdk/aws-ec2'

export interface ClassStackProps extends cdk.StackProps {
  readonly env: CustomEnvironment
}

export class CdkStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: ClassStackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    const vpcId = cdk.Fn.importValue(`${props.env.networkStackName}:VPCID`)
    const vpc = Vpc.fromVpcAttributes(this, 'peered-network', {
      vpcId: vpcId,
      availabilityZones: [
        cdk.Fn.select(0, cdk.Fn.getAzs()),
        cdk.Fn.select(1, cdk.Fn.getAzs()),
      ],
      publicSubnetIds: [
        cdk.Fn.importValue(`${props.env.networkStackName}:PublicSubnet1ID`),
        cdk.Fn.importValue(`${props.env.networkStackName}:PublicSubnet2ID`),
      ],
      privateSubnetIds: [
        cdk.Fn.importValue(`${props.env.networkStackName}:PrivateSubnet1ID`),
        cdk.Fn.importValue(`${props.env.networkStackName}:PrivateSubnet2ID`),
      ],
    })

    const instanceUserData = UserData.forLinux()
    instanceUserData.addCommands(
      'yum update -y',
      'yum install docker -y',
      'yum install git -y',
      'yum install jq -y',
      'sudo usermod -a -G docker ec2-user',
      'sudo systemctl start docker',
      'sudo systemctl enable docker',
      'export RUNNER_ALLOW_RUNASROOT=true',
      'mkdir actions-runner',
      'cd actions-runner',
      'curl -O -L https://github.com/actions/runner/releases/download/v2.262.1/actions-runner-linux-x64-2.262.1.tar.gz',
      'tar xzf ./actions-runner-linux-x64-2.262.1.tar.gz',
      'PAT=<Super Secret PAT>',
      'token=$(curl -s -XPOST -H "authorization": "token $PAT" https://api.github.com/repos/<GitHub_User>/<GitHub_Repo>/actions/runners/registration-token |jq -r .token)',
      'sudo chown ec2-user -R /actions-runner',
      './config.sh --url https://github.com/<GitHub_User>/<GitHub_Repo> --token $token --name "my-runners-$(hostname)" --work _work',
      'sudo ./svc.sh install',
      'sudo ./svc.sh start',
      'sudo chown ec2-user -R /actions-runner')

    const asg = new AutoScalingGroup(this, 'AutoScalingGroup', {
      autoScalingGroupName: this.stackName + '-asg',
      vpc: vpc,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE3_AMD, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux(),
      minCapacity: 0,
      maxCapacity: 2,
      desiredCapacity: 1,
      healthCheck: {
        type: 'EC2',
        gracePeriod: cdk.Duration.minutes(5),
      },
      spotPrice: '0.0100',
      userData: instanceUserData,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      instanceMonitoring: Monitoring.BASIC,
    })

    const security = new SecurityGroup(this, 'security', {
      vpc: vpc,
    })

    security.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'allow ssh')

    asg.addSecurityGroup(security)
  }
}
