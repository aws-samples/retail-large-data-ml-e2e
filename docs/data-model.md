# データモデル

本ソリューションは、小売業における店舗別、商品別の日次売上数予測のサンプルアーキテクチャを提供しています。
サンプルデータセットとして、以下のCSVファイルを準備しています。

| ファイル名 | データ名 | 概要 |
|-|-|-|
| categories.csv | 商品カテゴリマスタ | 商品の大分類、中分類、小分類などのカテゴリに関する情報 |
| event_calendar.csv | イベントカレンダ | 祝日や、全社的なイベントに関する情報。店舗からの入力が必要な「店舗別イベント情報」は用いない。|
| products.csv | 商品マスタ | 商品名、カテゴリ、価格などの商品に関する情報 |
| stores.csv | 店舗マスタ | 店舗タイプや所在地などの店舗に関する情報 |
| transactions.csv | 会計記録 | 1会計処理（トランザクション）を1レコードで記録。購買商品詳細はtransaction_details.csvに記録 |
| transaction_details.csv | 会計明細 | 会計内容の詳細、購買商品の種類ごとにレコードを持つ |
| weather.csv | 天気情報 | 外部システムから取得した日別、都道府県別の天気に関する情報 |

これらのデータは、社内システムや外部のデータ提供サービスから取得することを想定しています。
データはDWHに収集され、データの前処理（欠損値補完や特徴量生成）を行い、機械学習のインプットとなります。
本ソリューションではサンプルデータセットのCSVファイル群を Amazon Redshift Serverless に収集し、処理を行います。
また、顧客情報(customers.csv)の利用も予測の高度化には考えられますが、本ソリューションでは割愛します。

# 各CSVファイルのカラム（属性）説明
IDが連番である必要はありません。また、サンプルデータ以外の値を使っていただくことも可能です。

## categories.csv
商品カテゴリマスタ：商品の大分類、中分類、小分類などのカテゴリに関する情報

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|  
| category_id | カテゴリID | int | 1~14の連番 |
| category_level | カテゴリレベル | int | 1~3の数値 |
| category_name | カテゴリ名 | string | カテゴリ1~カテゴリ14 |
| parent_category_id | 親カテゴリID | int | 0または他のカテゴリIDを参照 |
| description | カテゴリ説明 | string | 全て同じ文言 |
| created_at | 作成日時 | datetime | 全て同じ日時 |
| updated_at | 更新日時 | datetime | 全て同じ日時 |

- IDと名前はカテゴリ1~カテゴリ14のデータ
- レベルは大カテゴリが1、中カテゴリが2、小カテゴリが3
- 親IDは層状のカテゴリ構造を参照
- 説明と日時は同一値 

## event_calendar.csv
イベントカレンダ：祝日や、全社的なイベントに関する情報。店舗からの入力が必要な「店舗別イベント情報」は用いない。

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|
| event_date | イベント日 | date | 2023年の祝日や特定の日付 |
| is_holiday | 祝日フラグ | boolean | 祝日はTrue | 
| event_name | イベント名 | string | 祝日名や任意の文字列 |
| event_description | イベント説明 | string | 祝日の説明文や任意の文言 |
| event_magnitude | イベントの影響度 | int | 1~3の数値 |
| created_at | 作成日時 | datetime | 全て同じ日時 |
| updated_at | 更新日時 | datetime | 全て同じ日時 |

- 2023年の祝日と任意のイベント日が設定されている
- 祝日はis_holiday=Trueとなっている
- イベントの影響度は1(small), 2(medium), 3(large)の3つが設定されている

## products.csv
商品マスタ：商品名、カテゴリ、価格などの商品に関する情報

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|
| product_id | 商品ID | int | 1~20の連番 |
| product_name | 商品名 | string | 商品1~商品20 |
| category_id | カテゴリID | int | 7~14の数値 |  
| description | 商品説明 | string | 全て同じ文言 |
| unit_price | 販売価格 | int | 198~998の数値 |
| barcode | JANコード | string | 全て同じ数値 |
| created_at | 作成日時 | datetime | 全て同じ日時 |
| updated_at | 更新日時 | datetime | 全て同じ日時 |

- 商品IDと商品名が1~20のデータ
- カテゴリIDは7~14の数値がランダム
- 商品説明とJANコードは同じ値
- 価格が198~998の間でランダム
- 日時データは全て同じ

## stores.csv
店舗マスタ：店舗タイプや所在地などの店舗に関する情報 

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|
| store_id | 店舗ID | int | 1~3の連番 |
| store_category | 店舗カテゴリ | int | 1~3の数値 |
| store_name | 店舗名 | string | 1店~3店の名称 |  
| total_floor_area | 総床面積 | int | 数値(m2) |
| city | 市区町村名 | string | XX区の記載 |
| prefecture | 都道府県名 | string | 千葉県、埼玉県 |
| postal_code | 郵便番号 | string | 123-4567のダミー |  
| phone | 電話番号 | string | 桁数固定のダミー |
| email | メールアドレス | string | ダミーのアドレス |
| created_at | 作成日時 | datetime | 全て同じ日時 |
| updated_at | 更新日時 | datetime | 全て同じ日時 |

- 店舗ID、店舗名は1~3のサンプルデータ
- 各種属性はダミーデータが設定されている
- 店舗カテゴリは、1(小型店), 2(中型店), 3(大型店)の3つが設定されている



## transactions.csv
会計記録：1会計処理（トランザクション）を1レコードで記録。購買商品詳細はtransaction_details.csvに記録

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|
| transaction_id | トランザクションID | int | 1~25059の連番 |
| store_id | 店舗ID | int | 1~3の店舗ID |
| customer_id | 顧客ID | int | 全て空値 |
| total_amount | 合計金額 | int | 198~15908の範囲 |
| tax_amount | 税額 | int | 217~17498の範囲 |  
| payment_method | 支払方法 | string | CASH, CREDIT_CARD, DEBIT_CARD, OTHERの4種類 |
| transaction_timestamp | トランザクション日時 | datetime | 2023-04-01 00:00~ 2023-04-30 00:00まで5分刻み | 
| created_at | 作成日時 | datetime | 全て2023-06-01 12:00:00 |
| updated_at | 更新日時 | datetime | 全て2023-06-01 12:00:00 |

- 1日分の5分ごとの店舗ごとのトランザクションデータ

## transaction_details.csv
会計明細：会計内容の詳細、購買商品の種類ごとにレコードを持つ

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|
| transaction_id | トランザクションID | int | 1~25059のトランザクションID |
| detail_no | 明細行番号 | int | 1~10の明細行 |  
| product_id | 商品ID | int | 1~20の商品ID |
| quantity | 数量 | int | 1~3の範囲 |
| unit_price | 単価 | int | 198~998円の範囲 |
| sell_price | 販売価格 | int | 99~998円の範囲 | 
| discount_rate | 割引率 | int | 0~50%の範囲 |
| created_at | 作成日時 | datetime | 全て2023-06-01 12:00:00 |
| updated_at | 更新日時 | datetime | 全て2023-06-01 12:00:00 |

## weather.csv
天気情報：外部システムから取得した日別、都道府県別の天気に関する情報

| カラム名 | 内容 | データ型 | サンプルデータの構成 |
|-|-|-|-|
| date | 日付 | date | 2023年4月1日から2023年4月30日までの30日間 |  
| prefecture | 都道府県名 | string | 茨城県、埼玉県、千葉県の3つ |
| temp_max | 最高気温 | int | 5~25度の範囲 |
| temp_min | 最低気温 | int | 5~15度の範囲 |  
| temp_ave | 平均気温 | int | 5~23度の範囲 |
| precipitation | 降水量 | int | 0~98mmの範囲 |
| created_at | 作成日時 | datetime | 全て2023-06-01 12:00:00 |
| updated_at | 更新日時 | datetime | 全て2023-06-01 12:00:00 |