import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'

export async function handler(event, context, callback) {
  const cloudwatchlogs = new CloudWatchLogs()

  const result = await cloudwatchlogs.getQueryResults({
    queryId: event.queryId,
  })

  if (result.status === 'Running') {
    console.log(`Query "${event.queryId}" is still running...`)

    return callback(null, {
      ...event,
      running: true,
    })
  }

  const mbResults = {
    provisonedMemoryMB: 0,
    maxMemoryUsedMB: 0,
    overProvisionedMB: 0,
  }

  if (result.results.length !== 0) {
    result.results[0].forEach((res) => {
      mbResults[res.field] = res.value
    })
  }

  console.log(`Query "${event.queryId}" is complete!`)

  return callback(null, {
    ...event,
    ...mbResults,
    running: false,
  })
}
