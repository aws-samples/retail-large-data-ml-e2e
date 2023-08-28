import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as quicksight from 'aws-cdk-lib/aws-quicksight';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { SalesPredictionDatabase } from './salespredictiondatabase';

export interface BIProps {
  sourceBucket: s3.Bucket;
  sourcePrefix?: string;
  adminPrincipalArn: string;
  salesPredictionDatabase: SalesPredictionDatabase;
}

export class BI extends Construct {
  readonly dashboardArn: string;
  readonly dashboardId: string;
  constructor(scope: Construct, id: string, props: BIProps) {
    super(scope, id);

    const datasourceName = cdk.Stack.of(this).stackName.toLowerCase() + '-ds';
    const dataSource = new quicksight.CfnDataSource(this, 'DS', {
      awsAccountId: cdk.Stack.of(this).account,
      dataSourceId: datasourceName,
      name: datasourceName,
      type: 'ATHENA',
      dataSourceParameters: {
        athenaParameters: {
          workGroup: 'primary'
        }
      }
    });
    const dataSetId = cdk.Stack.of(this).stackName.toLowerCase() + '-dataset';
    new quicksight.CfnDataSet(this, 'DataSet', {
      dataSetId: dataSetId,
      name: dataSetId,
      awsAccountId: cdk.Stack.of(this).account,
      importMode: 'DIRECT_QUERY',
      permissions: [
        {
          actions: [
            'quicksight:PassDataSet',
            'quicksight:DescribeIngestion',
            'quicksight:CreateIngestion',
            'quicksight:UpdateDataSet',
            'quicksight:DeleteDataSet',
            'quicksight:DescribeDataSet',
            'quicksight:CancelIngestion',
            'quicksight:DescribeDataSetPermissions',
            'quicksight:ListIngestions',
            'quicksight:UpdateDataSetPermissions'
          ],
          principal: props.adminPrincipalArn
        }
      ],
      physicalTableMap: {
        physicalTableMapKey: {
          customSql: {
            columns: [
              {
                name: 'product_id',
                type: 'STRING'
              },
              {
                name: 'store_id',
                type: 'STRING'
              },
              {
                name: 'processing_date',
                type: 'DATETIME'
              },
              {
                name: 'prediction',
                type: 'DECIMAL'
              }
            ],
            dataSourceArn: dataSource.attrArn,
            name: dataSetId,
            sqlQuery: `SELECT product_id, store_id, DATE(processing_date) AS processing_date, prediction FROM ${props.salesPredictionDatabase.databaseName}.${props.salesPredictionDatabase.tablename}`
          }
        }
      }
    });
  }
}
