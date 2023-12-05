#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RetailDataSolutionStack } from '../lib/retail-data-solution-stack';

const app = new cdk.App();

const trainingImageRepoUri = app.node.tryGetContext('trainingImageRepoUri');
const quickSightAdminArn = app.node.tryGetContext('quickSightAdminArn');
const trainingInstanceType = app.node.tryGetContext('trainingInstanceType');
const inferenceInstanceType = app.node.tryGetContext('inferenceInstanceType');
const inferenceInstanceCount = app.node.tryGetContext('inferenceInstanceCount');

new RetailDataSolutionStack(app, 'RetailDataSolutionStack', {
  trainingImageRepoUri: trainingImageRepoUri,
  quickSightAdminArn: quickSightAdminArn,
  trainingInstanceType: trainingInstanceType,
  inferenceInstanceType: inferenceInstanceType,
  inferenceInstanceCount: inferenceInstanceCount
});
