import * as cdk from '@aws-cdk/core'
import { CustomEnvironment } from './custom-environment'
import { Vpc } from '@aws-cdk/aws-ec2'
import {
  Cluster,
  ContainerImage,
  FargatePlatformVersion,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  Secret,
} from '@aws-cdk/aws-ecs'
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets'
import { StringParameter } from '@aws-cdk/aws-ssm'

export interface ClassStackProps extends cdk.StackProps {
  readonly env: CustomEnvironment
  readonly dockerImagePath: string
}

export class ActionsStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: ClassStackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    const vpcId = cdk.Fn.importValue(`${props.env.networkStackName}:VPCID`)
    const vpc = Vpc.fromVpcAttributes(this, props.env.networkStackName, {
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

    const cluster = new Cluster(this, 'GitHubActionsRunnerCluster', {
      vpc: vpc,
    })

    const runner = new FargateTaskDefinition(
      this,
      'GitHubActionsRunnerTaskDefinition',
      {
        cpu: 256,
        memoryLimitMiB: 512,
      },
    )

    const runnerContainer = new DockerImageAsset(this, 'GithubRunner', {
      directory: props.env.dockerImagePath,
      file: './Dockerfile',
    })

    runner.addContainer('GitHubActionsRunnerContainer', {
      image: ContainerImage.fromDockerImageAsset(runnerContainer),
      logging: LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
      secrets: {
        GITHUB_ACCESS_TOKEN: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubAccessToken',
            {
              parameterName: 'GITHUB_ACCESS_TOKEN',
              version: 0,
            },
          ),
        ),
        GITHUB_ACTIONS_RUNNER_CONTEXT: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubActionsRunnerContext',
            {
              parameterName: 'GITHUB_ACTIONS_RUNNER_CONTEXT',
              version: 0,
            },
          ),
        ),
      },
    })

    const ecsService = new FargateService(
      this,
      'GitHubActionsRunnerService',
      {
        cluster,
        taskDefinition: runner,
        platformVersion: FargatePlatformVersion.VERSION1_4,
      },
    )
  }
}
