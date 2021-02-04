#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { CdkStack } from '../src/cdk-stack'
import { GitHubListenerStack } from '../src/github-listener'
import { CustomEnvironment } from '../src/custom-environment'
import { getRequiredContext } from '../src/context-helpers'

const app = new cdk.App()

// const envName = getRequiredContext(app.node, 'env')
// const env = CustomEnvironment.fromContext(app.node, envName)

// new CdkStack(app, 'CdkStack', {
//     env: env,
// }) // eslint-disable-line no-new

new GitHubListenerStack(app, 'GitHubListenerStack', {}) // eslint-disable-line no-new
