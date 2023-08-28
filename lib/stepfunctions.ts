import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfntasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Redshift } from './redshift';
import { ML } from './ml';
import { SalesPredictionDatabase } from './salespredictiondatabase';

import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export interface WorkFlowProps {
  sourceBucket: s3.Bucket;
  destinationBucket: s3.Bucket;
  trainingImageRepoUri: string;
  trainingInstanceType: string;
  inferenceInstanceType: string;
  rs: Redshift;
  ml: ML;
  salesPredictionDatabase: SalesPredictionDatabase;
}

export class WorkFlow extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  private rs: Redshift;
  private ml: ML;

  constructor(scope: Construct, id: string, props: WorkFlowProps) {
    super(scope, id);
    this.rs = props.rs;
    this.ml = props.ml;

    // post inference, to get files ready for BI.
    const postInference = new PythonFunction(this, 'PostInference', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/postinference',
      handler: 'handler',
      memorySize: 2048,
      timeout: cdk.Duration.minutes(15)
    });
    this.ml.inferenceOutputBucket.grantRead(postInference);
    this.ml.sourceBucket.grantRead(postInference);
    props.destinationBucket.grantReadWrite(postInference);
    postInference.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [`arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:crawler/${props.salesPredictionDatabase.crawlerName}`],
        actions: ['glue:StartCrawler']
      })
    );

    // wake up Redshift Serverless
    const startStep = new sfntasks.LambdaInvoke(this, `WakeUpRedshift`, {
      lambdaFunction: this.rs.kicker,
      payload: sfn.TaskInput.fromObject({
        scriptName: 'wakeup_redshift',
        environments: sfn.JsonPath.objectAt('$')
      }),
      resultPath: `$.wakeupRedshift`
    });
    const waitForWakeUp = new sfn.Wait(this, `WaitForWakeUp`, {
      time: sfn.WaitTime.duration(cdk.Duration.minutes(10))
    });
    startStep.next(waitForWakeUp);

    const doneWeather = this.sqlSteps(waitForWakeUp, this.rs.kicker, this.rs.waiter, 'load_weather');
    const doneCategories = this.sqlSteps(doneWeather, this.rs.kicker, this.rs.waiter, 'load_categories');
    const doneProducts = this.sqlSteps(doneCategories, this.rs.kicker, this.rs.waiter, 'load_products');
    const doneStores = this.sqlSteps(doneProducts, this.rs.kicker, this.rs.waiter, 'load_stores');
    const doneEventCalendar = this.sqlSteps(doneStores, this.rs.kicker, this.rs.waiter, 'load_event_calendar');
    const doneTransactions = this.sqlSteps(doneEventCalendar, this.rs.kicker, this.rs.waiter, 'load_transactions');
    const doneTransactionDetails = this.sqlSteps(doneTransactions, this.rs.kicker, this.rs.waiter, 'load_transaction_details');
    const doneDailyQuantity = this.sqlSteps(doneTransactionDetails, this.rs.kicker, this.rs.waiter, 'load_daily_quantity');
    const doneFeatures = this.sqlSteps(doneDailyQuantity, this.rs.kicker, this.rs.waiter, 'load_features');
    const doneUnloadingTrainingData = this.sqlSteps(doneFeatures, this.rs.kicker, this.rs.waiter, 'unload_to_s3_training');
    const doneLoading = this.sqlSteps(doneUnloadingTrainingData, this.rs.kicker, this.rs.waiter, 'unload_to_s3_inference');
    const doneTraining = this.trainingStep(doneLoading);
    const doneInference = this.inferenceStep(doneTraining);
    doneInference.next(
      new sfntasks.LambdaInvoke(this, 'PostInferenceStep', {
        lambdaFunction: postInference,
        resultPath: `$.postInferenceResult`,
        payload: sfn.TaskInput.fromObject({
          environments: sfn.JsonPath.objectAt('$'),
          jobname: sfn.JsonPath.stringAt('$$.Execution.Name')
        })
      })
    );

    const sm = new sfn.StateMachine(this, 'StateMachine', {
      definition: startStep
    });

    // Lambda function to start the StepFunction
    const workflowStarter = new PythonFunction(this, 'Starter', {
      runtime: lambda.Runtime.PYTHON_3_10,
      entry: 'lambda/stepfunction-starter',
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.minutes(1),
      environment: {
        STEPFUNCTION_ARN: sm.stateMachineArn,
        REDSHIFT_WORKGROUP: this.rs.workgroupArn,
        REDSHIFT_NAMESPACE: this.rs.namespace,
        REDSHIFT_DATABASENAME: this.rs.database,
        DATASOURCE_BUCKET_NAME: props.sourceBucket.bucketName,
        ML_SOURCE_BUCKET_NAME: this.ml.sourceBucket.bucketName,
        ML_TRAINING_OUT_BUCKET_NAME: this.ml.trainingOutputBucket.bucketName,
        ML_INFERENCE_OUT_BUCKET_NAME: this.ml.inferenceOutputBucket.bucketName,
        DESTINATION_BUCKET_NAME: props.destinationBucket.bucketName,
        ROLEARN_TO_READ_DATASOURCE: this.rs.rsRole.roleArn,
        ROLEARN_FOR_SAGEMAKER: this.ml.role.roleArn,
        TRAINING_INSTANCE_TYPE: props.trainingInstanceType,
        INFERENCE_INSTANCE_TYPE: props.inferenceInstanceType,
        GLUE_CRAWLER: props.salesPredictionDatabase.crawlerName
      }
    });
    sm.grantStartExecution(workflowStarter);
  }

  private sqlSteps(before: sfn.INextable, kicker: lambda.IFunction, waiter: lambda.IFunction, scriptName: string): sfn.INextable {
    const done = new sfn.Pass(this, `Done${scriptName}`);
    const kickerStep = new sfntasks.LambdaInvoke(this, `${scriptName}LoadKickerStep`, {
      lambdaFunction: kicker,
      resultPath: `$.loadKickerResult.${scriptName}`,
      payload: sfn.TaskInput.fromObject({
        scriptName: scriptName,
        environments: sfn.JsonPath.objectAt('$')
      })
    });
    const loop = new sfn.Wait(this, `${scriptName}Wait5SecondStep`, {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(5))
    });
    kickerStep.next(loop);
    loop
      .next(
        new sfntasks.LambdaInvoke(this, `${scriptName}LoadWaiterStep`, {
          lambdaFunction: waiter,
          inputPath: `$.loadKickerResult.${scriptName}.Payload`,
          resultPath: `$.loadWaiterResult.${scriptName}`
        })
      )
      .next(
        new sfn.Choice(this, `${scriptName}LambdaResultChoiceStep`)
          .when(sfn.Condition.booleanEquals(`$.loadWaiterResult.${scriptName}.Payload`, false), loop)
          .otherwise(done)
      );

    before.next(kickerStep);
    return done;
  }

  trainingStep(before: sfn.INextable): sfn.INextable {
    const done = new sfn.Pass(this, 'DoneTraining');
    const step = new sfntasks.LambdaInvoke(this, 'TrainingKicker', {
      lambdaFunction: this.ml.kicker,
      resultPath: `$.trainingResult`,
      payload: sfn.TaskInput.fromObject({
        environments: sfn.JsonPath.objectAt('$'),
        jobname: sfn.JsonPath.stringAt('$$.Execution.Name')
      })
    });

    const loop = new sfn.Wait(this, `WaitForTrainingStep`, {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30))
    });
    step.next(loop);
    loop
      .next(
        new sfntasks.LambdaInvoke(this, `TrainingWaiter`, {
          lambdaFunction: this.ml.waiter,
          payload: sfn.TaskInput.fromObject({
            environments: sfn.JsonPath.objectAt('$'),
            jobname: sfn.JsonPath.stringAt('$$.Execution.Name')
          }),
          resultPath: '$.trainingWaiterResult'
        })
      )
      .next(
        new sfn.Choice(this, 'TrainingWaiterResultChoiceStep').when(sfn.Condition.booleanEquals('$.trainingWaiterResult.Payload', false), loop).otherwise(done)
      );
    before.next(step);
    return done;
  }

  inferenceStep(before: sfn.INextable): sfn.INextable {
    const done = new sfn.Pass(this, 'DoneInference');
    const step = new sfntasks.LambdaInvoke(this, 'InferenceKicker', {
      lambdaFunction: this.ml.inferenceKicker,
      resultPath: `$.inferenceResult`,
      payload: sfn.TaskInput.fromObject({
        environments: sfn.JsonPath.objectAt('$'),
        jobname: sfn.JsonPath.stringAt('$$.Execution.Name')
      })
    });
    const loop = new sfn.Wait(this, `WaitForInferenceStep`, {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30))
    });
    step.next(loop);
    loop
      .next(
        new sfntasks.LambdaInvoke(this, `InferenceWaiter`, {
          lambdaFunction: this.ml.inferenceWaiter,
          payload: sfn.TaskInput.fromObject({
            environments: sfn.JsonPath.objectAt('$'),
            jobname: sfn.JsonPath.stringAt('$$.Execution.Name')
          }),
          resultPath: '$.inferenceWaiterResult'
        })
      )
      .next(
        new sfn.Choice(this, 'InferenceWaiterResultChoiceStep')
          .when(sfn.Condition.booleanEquals('$.inferenceWaiterResult.Payload', false), loop)
          .otherwise(done)
      );
    before.next(step);
    return done;
  }
}
