import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { BI } from './bi';
import { ML } from './ml';
import { Redshift } from './redshift';
import { WorkFlow } from './stepfunctions';
import { SalesPredictionDatabase } from './salespredictiondatabase';

interface RetailDataSolutionStackProps extends cdk.StackProps {
  dataSource?: rds.DatabaseCluster;
  trainingImageRepoUri: string;
  quickSightAdminArn: string;
  trainingInstanceType: string;
  inferenceInstanceType: string;
}
export class RetailDataSolutionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RetailDataSolutionStackProps) {
    super(scope, id, props);

    // S3 Bucket for data input.
    const dataBucket = new s3.Bucket(this, 'InputBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const destBucket = new s3.Bucket(this, 'DestinationBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const salesPredictionDatabase = new SalesPredictionDatabase(this, 'SalesPredictionDatabase', {
      sourceBucket: destBucket,
      sourcePrefix: '/'
    });

    const ml = new ML(this, 'ML', { outputBucket: destBucket });

    const rs = new Redshift(this, 'Redshift', {
      sourceBucket: dataBucket,
      destinationBucket: ml.sourceBucket,
      salesPredictionBucket: destBucket,
      salesPredictionDatabaseName: salesPredictionDatabase.databaseName
    });

    const bi = new BI(this, 'BI', {
      sourceBucket: destBucket,
      sourcePrefix: '/',
      adminPrincipalArn: props.quickSightAdminArn,
      salesPredictionDatabase: salesPredictionDatabase
    });

    new WorkFlow(this, 'WorkFlow', {
      sourceBucket: dataBucket,
      destinationBucket: destBucket,
      trainingImageRepoUri: props.trainingImageRepoUri,
      trainingInstanceType: props.trainingInstanceType,
      inferenceInstanceType: props.inferenceInstanceType,
      rs: rs,
      ml: ml,
      salesPredictionDatabase: salesPredictionDatabase
    });
  }
}
