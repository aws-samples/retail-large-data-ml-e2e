import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as redshiftserverless from 'aws-cdk-lib/aws-redshiftserverless';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export interface RedshiftProps {
  sourceBucket: s3.Bucket;
  destinationBucket: s3.Bucket;
  salesPredictionBucket: s3.Bucket;
  salesPredictionDatabaseName: string;
}

export class Redshift extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly workgroupArn: string;
  public readonly workgroupName: string;
  public readonly namespace: string;
  public readonly database: string;
  public readonly rsRole: iam.Role;
  public readonly lambdaRole: iam.Role;
  public readonly kicker: lambda.IFunction;
  public readonly waiter: lambda.IFunction;
  public readonly host: string;

  constructor(scope: Construct, id: string, props: RedshiftProps) {
    super(scope, id);

    const projectname = 'retaildatasolution'; // used for workgroup, namespace, db name, etc
    this.workgroupName = projectname;
    this.database = projectname;
    this.namespace = projectname;

    // role for the Redshift
    this.rsRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('redshift.amazonaws.com')
    });
    // Redshift needs to read/write data in these buckets.
    props.sourceBucket.grantRead(this.rsRole);
    props.destinationBucket.grantReadWrite(this.rsRole);
    props.salesPredictionBucket.grantRead(this.rsRole);
    // Redshift Spectrum needs glue rights to access external tables
    // https://docs.aws.amazon.com/ja_jp/redshift/latest/dg/c-spectrum-iam-policies.html#spectrum-iam-policies-minimum-permissions
    this.rsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'glue:CreateDatabase',
          'glue:DeleteDatabase',
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:UpdateDatabase',
          'glue:CreateTable',
          'glue:DeleteTable',
          'glue:BatchDeleteTable',
          'glue:UpdateTable',
          'glue:GetTable',
          'glue:GetTables',
          'glue:BatchCreatePartition',
          'glue:CreatePartition',
          'glue:DeletePartition',
          'glue:BatchDeletePartition',
          'glue:UpdatePartition',
          'glue:GetPartition',
          'glue:GetPartitions',
          'glue:BatchGetPartition'
        ],
        resources: ['*']
      })
    );

    // all the lambda functions should have a common role if they need to call redshift
    // otherwise redshift-data.describe-statement would not return the information about statements
    // which are kicked by another function.
    this.lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    // RedShift Credentials
    const secret = new secretsmanager.Secret(this, 'Secret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '\'"/@ \\'
      }
    });
    const initer = new PythonFunction(this, 'Init', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/redshiftinit',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15),
      environment: {
        REDSHIFT_WORKGROUP: this.workgroupName,
        REDSHIFT_NAMESPACE: this.namespace,
        REDSHIFT_DATABASENAME: this.database,
        ROLEARN_TO_READ_DATASOURCE: this.rsRole.roleArn,
        SALES_PREDICTION_DATABASENAME: props.salesPredictionDatabaseName,
        SECRET_ARN: secret.secretArn
      },
      role: this.lambdaRole
    });
    secret.grantRead(initer);

    // Redshift Serverless namespace
    const ns = new redshiftserverless.CfnNamespace(this, 'Namespace', {
      namespaceName: this.namespace,
      dbName: this.database,
      defaultIamRoleArn: this.rsRole.roleArn,
      adminUsername: 'admin',
      adminUserPassword: secret.secretValueFromJson('password').unsafeUnwrap(), // safe usage.
      iamRoles: [this.rsRole.roleArn]
    });

    // Redshift Serverless workgroup
    const workGroup = new redshiftserverless.CfnWorkgroup(this, 'Workgroup', {
      namespaceName: this.namespace,
      workgroupName: this.workgroupName
    });
    this.workgroupArn = workGroup.attrWorkgroupWorkgroupArn;
    workGroup.addDependency(ns);
    this.host = workGroup.attrWorkgroupEndpointAddress;

    this.lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    this.lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['redshift-data:GetStatementResult', 'redshift-data:DescribeStatement'],
        resources: ['*']
      })
    );
    this.lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['redshift-serverless:GetCredentials', 'redshift-data:BatchExecuteStatement', 'redshift-data:ExecuteStatement'],
        resources: [workGroup.attrWorkgroupWorkgroupArn]
      })
    );

    // RedshiftでSQLをキックするLambda
    this.kicker = new PythonFunction(this, 'LoadKicker', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/redshiftloadkicker',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15),
      role: this.lambdaRole
    });
    // RedshiftでキックしたSQLの完了を待つLambda
    this.waiter = new PythonFunction(this, 'LoadWaiter', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/redshiftloadwaiter',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.minutes(15),
      role: this.lambdaRole
    });
  }
}
