import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as glue from '@aws-cdk/aws-glue-alpha';
import * as gl from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { GlueTable } from './gluetable';

export interface SalesPredictionDatabaseProps {
  sourceBucket: s3.Bucket;
  sourcePrefix?: string;
}

export class SalesPredictionDatabase extends Construct {
  readonly tablename: string;
  readonly crawlerName: string;
  readonly databaseName: string;
  constructor(scope: Construct, id: string, props: SalesPredictionDatabaseProps) {
    super(scope, id);

    const database = new glue.Database(this, 'Database', {});
    this.databaseName = database.databaseName;
    this.tablename = 'sales_prediction';
    const glueTable = new GlueTable(this, 'SalesPrediction', {
      database: database,
      tableName: this.tablename,
      bucket: props.sourceBucket,
      s3Prefix: props.sourcePrefix,
      columns: [
        { name: 'product_id', type: glue.Schema.STRING.inputString },
        { name: 'store_id', type: glue.Schema.STRING.inputString },
        { name: 'processing_date', type: glue.Schema.STRING.inputString },
        { name: 'prediction', type: glue.Schema.FLOAT.inputString }
      ],
      partitionKeys: [
        { name: 'year', type: glue.Schema.STRING.inputString },
        { name: 'month', type: glue.Schema.STRING.inputString },
        { name: 'day', type: glue.Schema.STRING.inputString }
      ]
    });

    const crawlerRole = new iam.Role(this, 'CrawlerRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
    });
    props.sourceBucket.grantReadWrite(crawlerRole);
    // オブジェクトとバケット自体へのアクセス権限
    const srcBucketArn = `arn:aws:s3:::${props.sourceBucket}`;
    crawlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket',
          'glue:GetTable',
          'glue:GetTables',
          'glue:GetDatabase',
          'glue:BatchGetPartition',
          'glue:BatchCreatePartition',
          'glue:BatchUpdatePartition',
          'glue:GetPartition',
          'glue:GetPartitions',
          'glue:UpdateTable',
          'glue:CreatePartition',
          'glue:UpdatePartition'
        ],
        resources: [
          srcBucketArn + '/*',
          srcBucketArn,
          `arn:aws:glue:*:${cdk.Stack.of(this).account}:catalog`,
          `arn:aws:glue:*:${cdk.Stack.of(this).account}:database/${database.databaseName}`,
          `arn:aws:glue:*:${cdk.Stack.of(this).account}:table/${database.databaseName}/*`
        ]
      })
    );
    crawlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*']
      })
    );

    this.crawlerName = cdk.Stack.of(this).stackName + 'crawler';
    const crawler = new gl.CfnCrawler(this, 'Crawler', {
      name: this.crawlerName,
      role: crawlerRole.roleArn,
      databaseName: database.databaseName,
      recrawlPolicy: {
        recrawlBehavior: 'CRAWL_EVERYTHING'
      },
      schemaChangePolicy: {
        deleteBehavior: 'LOG',
        updateBehavior: 'LOG'
      },
      targets: {
        catalogTargets: [
          {
            databaseName: database.databaseName,
            tables: [glueTable.tableName]
          }
        ]
      },
      configuration:
        '{"Version":1.0,"CrawlerOutput":{"Partitions":{"AddOrUpdateBehavior":"InheritFromTable"}},"Grouping":{"TableGroupingPolicy":"CombineCompatibleSchemas"}}'
    });
    crawler.addDependency(glueTable.tbl);
    crawler.node.addDependency(crawlerRole);
  }
}
