import AWS from 'aws-sdk'

export async function handler(event, context, callback) {
  const cloudwatchlogs = new AWS.CloudWatchLogs()
  const timestamp = new Date()
  const logGroupName = `/aws/lambda/${event.name}`

  const result = await cloudwatchlogs
    .startQuery({
      endTime: timestamp.getTime(),
      queryString: `
        filter @type = "REPORT"
        | stats max(@memorySize / 1024 / 1024) as provisonedMemoryMB,
          max(@maxMemoryUsed / 1024 / 1024) as maxMemoryUsedMB,
          provisonedMemoryMB - maxMemoryUsedMB as overProvisionedMB
      `,
      startTime: timestamp.setDate(timestamp.getDate() - event.days),
      logGroupName,
    })
    .promise()

  console.log(`Query started for "${event.name}", with id: ${result.queryId}`)

  return callback(null, {
    ...event,
    queryId: result.queryId,
  })
}
