#!/bin/bash

echo "create prefix in ${INPUTBUCKET}"

prefixs=(
    "${PROCESSINGDATE}/categories"
    "${PROCESSINGDATE}/customers"
    "${PROCESSINGDATE}/event_calendar"
    "${PROCESSINGDATE}/products"
    "${PROCESSINGDATE}/stores"
    "${PROCESSINGDATE}/transaction_details"
    "${PROCESSINGDATE}/transactions"
    "${PROCESSINGDATE}/weather"
)

for prefix in "${prefixs[@]}" ; do
    echo "${INPUTBUCKET}/${prefix}"
    aws s3api put-object --bucket $INPUTBUCKET --key ${prefix}/
done
