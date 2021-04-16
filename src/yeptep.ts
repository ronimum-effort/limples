import * as cdk from '@aws-cdk/core'
import { PipelineProject, BuildSpec, ComputeType } from '@aws-cdk/aws-codebuild'
import { DockerCodeBuildAction } from '../../ndlib-cdk/src/docker-codebuild-action'

export interface ClassStackProps extends cdk.StackProps {
    readonly dockerhubCredentialsPath: string
  }

export class FoundationStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: ClassStackProps) {
    super(scope, id, props)

    // #region Create a VPC prop that can be used by other stacks

    const smokeTestsProject = new PipelineProject(this, `SmokeTests`, {
        buildSpec: BuildSpec.fromObject({
          phases: {
            build: {
              commands: [
                'newman run spec/postman/spec.json --env-var app-host=${TARGET_HOST} --env-var host-protocol=https',
              ],
            },
          },
          version: '0.2',
        }),
        environment: {
          buildImage: DockerCodeBuildAction.fromDockerImage(this, 'CodeBuild', 'alpine:3', '/all/dockerhub/credentials'),
          computeType: ComputeType.MEDIUM
        },
        
      })
}}