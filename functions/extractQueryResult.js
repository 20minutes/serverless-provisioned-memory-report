import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'

export async function handler(event) {
  const cloudwatchlogs = new CloudWatchLogs()

  const result = await cloudwatchlogs.getQueryResults({
    queryId: event.queryId,
  })

  if (['Running', 'Scheduled'].includes(result.status)) {
    console.info(`Query "${event.queryId}" is still running...`)

    return {
      ...event,
      running: true,
    }
  }

  if (result.status !== 'Complete') {
    throw new Error(`Query "${event.queryId}" ended with status: ${result.status}`)
  }

  const mbResults = {
    provisionedMemoryMB: 0,
    maxMemoryUsedMB: 0,
    overProvisionedMB: 0,
  }

  if (result.results?.length > 0) {
    result.results[0].forEach((res) => {
      mbResults[res.field] = res.value
    })
  }

  console.info(`Query "${event.queryId}" is complete!`)

  return {
    ...event,
    ...mbResults,
    running: false,
  }
}
