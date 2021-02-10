import * as cdk from '@aws-cdk/core'
import { LambdaRestApi } from '@aws-cdk/aws-apigateway'
import { Code, Function, Runtime, Tracing } from '@aws-cdk/aws-lambda'
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs'
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam'

export class GitHubListenerStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    const logs = new LogGroup(this, 'LambdaLogGroup')

    const webhookListener = new Function(this, 'Listener', {
      code: Code.fromAsset('lambdas/'),
      runtime: Runtime.NODEJS_12_X,
      handler: 'github-webhook.githubWebhookListener',
      environment: {
        GITHUB_WEBHOOK_SECRET: '/all/github-listener/github-token',
      },
      logRetention: RetentionDays.ONE_WEEK,
      tracing: Tracing.ACTIVE,
    })

    const api = new LambdaRestApi(this, 'webhook-listener', {
      handler: webhookListener,
    })

    webhookListener.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:*',
      ],
      resources: [
        cdk.Fn.sub('arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/all/github-listener/github-secret'),
      ],
    }))
  }
}
