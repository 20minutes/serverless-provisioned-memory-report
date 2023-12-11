# Serverless Provisioned Memory Report

[![serverless](http://public.serverless.com/badges/v3.svg)](https://serverless.com/)
[![Build Status](https://github.com/20minutes/serverless-provisioned-memory-report/actions/workflows/tests.yml/badge.svg)](https://github.com/20minutes/serverless-provisioned-memory-report/actions/workflows/tests.yml)

Analyse logs from Lambdas to determine the provisioned memory usage (defined, max & over) and post them to Slack. You'll then be able to adjust the memory size of your lambdas and _hopefully_ save money 💸

![Example](https://user-images.githubusercontent.com/62333/181353176-6325fb25-8675-4012-b049-771e287a5bde.png)

## How it works

1. We first fetch all your lambdas
2. For each lambda, we run a custom CloudWatchLogs query to determine: provisoned memory, max used memory and over provisioned memory
3. Once all queries are complete, we send the report to your Slack

Here is the Step Functions definition:

![Step Functions definition](https://user-images.githubusercontent.com/62333/192753793-5c6d0a03-4033-4f5a-b091-16dcd1ed3217.png)

## Analyse the report

Once you got the report, you can take action from it based on the _over_ column:
- if the value is negative, it means you must increase the memory size of that lambda because it often hit the limit
- if the value is high (compared to the defined memory), it means you can decrease the memory to something more that the max used
- if the value is between ~50 & ~100, the defined memory is fine!

For example, take that report:

```
Function              Defined Provisioned      Max     Over
-----------------------------------------------------------
function1                 768         732      733       -1
function2                1024         977       95      881
function3                 300         286      214       72
```

Here are the actions you might take:

1. `function1` must have more memory, define it to `1024` (or at least to something more that `768`)
2. `function2` is over provisioned by a lot, lower it to `128`
3. `function3` is fine

## Prerequisites

- Node.js 20
- Serverless CLI >=3.37.0
- An AWS account
- Defined [provider credentials](https://serverless.com/framework/docs/providers/aws/guide/credentials/)
- An [Incoming Webhook URL](https://api.slack.com/messaging/webhooks) from Slack

## Deploy the code

Create the `.env`: `cp .env.dist .env` and then update the Slack webhook url in the file.

Deploy the service using: `serverless deploy`

By default

- it'll use the AWS profile `default`, but you can use your own using (be sure it's defined in your `~/.aws/credentials`): `serverless deploy --aws-profile myprofile`
- it'll be deployed to the AWS region `eu-west-1` but you can change it using: `serverless deploy --region us-east-1`

## Trigger the Step Function

You can trigger it manually by sending an empty json. It'll then fetch all your lambdas but it'll keep only the first 30 of them (because there can be only 30 CloudWatchLogs query in parallel). You can use pagination to fetch the rest of functions.

You can also provide some options:

- `prefix`: to keep only lambdas starting with that value (empty by default)
- `channel`: the Slack channel ID or name to post the report (default to `#general`)
- `days`: number of days to fetch log (default to `7`)
- `page`: page to retrieve (based on 30 functions per page) (default to `1`)

For example:

```json
{
  "prefix": "prod-",
  "channel": "C03PE644XH8",
  "days": 2,
  "page": 2
}
```

## How we are using it

We defined some CloudWatch events to trigger the Step Function every monday with predefined options to fetch from the past 7 days all lambdas from all our projects.

So we have configured around 10 _cron_ to have report from the past week to quickly adjust the memory. And all reports are posted to a dedicated project Slack channel.
