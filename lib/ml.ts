import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface MLProps {}

export class ML extends Construct {
  public readonly sourceBucket: s3.Bucket;
  public readonly trainingOutputBucket: s3.Bucket;
  public readonly inferenceOutputBucket: s3.Bucket;
  public readonly kicker: lambda.IFunction;
  public readonly waiter: lambda.IFunction;
  public readonly inferenceKicker: lambda.IFunction;
  public readonly inferenceWaiter: lambda.IFunction;
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: MLProps) {
    super(scope, id);

    // S3 Bucket for data input.
    this.sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // S3 Bucket for training output such as model.tar.gz
    this.trainingOutputBucket = new s3.Bucket(this, 'TrainingOutputBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // S3 Bucket for inference result.
    this.inferenceOutputBucket = new s3.Bucket(this, 'InferenceOutputBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com')
    });
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:*', 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*']
      })
    );
    this.kicker = new PythonFunction(this, 'TrainingKicker', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/trainingkicker',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15)
    });

    this.waiter = new PythonFunction(this, 'TrainingWaiter', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/trainingwaiter',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15)
    });

    this.inferenceKicker = new PythonFunction(this, 'InferenceKicker', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/inferencekicker',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15)
    });

    this.inferenceWaiter = new PythonFunction(this, 'InferenceWaiter', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/inferencewaiter',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15)
    });

    this.kicker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:CreateTrainingJob', 'sagemaker:AddTags'],
        resources: ['*']
      })
    );
    this.waiter.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:DescribeTrainingJob'],
        resources: ['*']
      })
    );
    this.inferenceWaiter.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:DescribeTransformJob'],
        resources: ['*']
      })
    );

    this.role.grantPassRole(this.kicker.role!);
    this.role.grantPassRole(this.inferenceKicker.role!);
    this.sourceBucket.grantRead(this.role);
    this.sourceBucket.grantReadWrite(this.kicker);
    this.sourceBucket.grantDelete(this.kicker);
    this.sourceBucket.grantReadWrite(this.inferenceKicker);
    this.sourceBucket.grantDelete(this.inferenceKicker);
    this.trainingOutputBucket.grantReadWrite(this.role);
    this.trainingOutputBucket.grantReadWrite(this.inferenceKicker);
    this.inferenceOutputBucket.grantWrite(this.role);
    this.inferenceKicker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:CreateModel', 'sagemaker:CreateTransformJob'],
        resources: ['*']
      })
    );

    const policy = new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListMultipartUploadParts', 's3:ListBucket', 's3:HeadObject'],
      resources: [`arn:aws:s3:::jumpstart-cache-prod-${cdk.Stack.of(this).region}`, `arn:aws:s3:::jumpstart-cache-prod-${cdk.Stack.of(this).region}/*`]
    });
    this.role.addToPolicy(policy);
    this.kicker.addToRolePolicy(policy);
    this.inferenceKicker.addToRolePolicy(policy);
  }
}
