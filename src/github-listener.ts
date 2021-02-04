import * as cdk from '@aws-cdk/core'
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway'
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda'
import { StringParameter } from '@aws-cdk/aws-ssm'

export class GitHubListenerStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    const webhookListener = new Function(this,'Listener',{
      code: Code.fromAsset('lambdas/'),
      runtime: Runtime.NODEJS_12_X,
      handler: 'githubWebhookListener',
      environment:{
        GITHUB_WEBHOOK_SECRET: "/all/github-listener/github-token",
      },
    })

    const api = new RestApi(this, 'webhook-listener', {
      description: 'GitHub PR Lsitener',
    })

    

    api.root.addMethod('POST', new LambdaIntegration(Function.fromFunctionArn(this,'webhookArn',webhookListener.functionArn)))

    

  }
}
