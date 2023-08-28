# カスタマイズガイド

カスタマイズするためのヒント集です。今後追記予定です

* Amazon SageMaker と LightGBM により、product_id, store_idごとの、実行日の翌日の売上数量を予測しています。特徴量作成は [Amazon Redshift で行っており](/lambda/redshiftloadkicker/loadscripts/load_features.sql)、S3にアンロードしています([学習Job用](/lambda/redshiftloadkicker/loadscripts/unload_to_s3_training.sql)、[推論Job用](/lambda/redshiftloadkicker/loadscripts/unload_to_s3_training.sql))。この部分をカスタマイズすることで何を予測するかを変更可能です。[特徴量の一列目が予測対象となります](https://docs.aws.amazon.com/sagemaker/latest/dg/lightgbm.html)

* 現状では Amazon QuickSight による推論結果の可視化について、データソースとして Amazon Athena を利用しています。大元のデータは Amazon Redshift Serverless に格納しているため、予測データと大元のデータを JOIN することで、より多彩な分析が可能となります。予測データは Amazon Redshift Spectrum で外部表として参照可能な状態となっています

* もしこのソリューションを ap-northeast-1 以外のリージョンにデプロイする場合、cdk deploy の前に、[cdk.json](/cdk.json)の `trainingImageRepoUri` の編集が必要です。SageMaker の [PyTorch DLC](https://github.com/aws/deep-learning-containers/blob/master/available_images.md) を設定してください

* 予測に利用されるアルゴリズムは LightGBM です。学習ジョブ、推論ジョブの両方で`ml.m5.xlarge`というインスタンスタイプが使われていますが、変更するには cdk deploy の前に、[cdk.json](/cdk.json)の`trainingInstanceType`や`inferenceInstanceType`を編集してください

* LightGBM の学習において、例えば HyperParameter を変更したい場合、実装は[ここ](../lambda/trainingkicker/index.py)にあります。[SageMakerのドキュメント](https://docs.aws.amazon.com/sagemaker/latest/dg/lightgbm-hyperparameters.html)を参考に実装を編集してください

