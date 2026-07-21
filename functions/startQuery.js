import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'

export async function handler(event) {
  const cloudwatchlogs = new CloudWatchLogs()
  const endTime = Math.floor(Date.now() / 1000)
  const startTime = endTime - event.days * 24 * 60 * 60
  const logGroupName = `/aws/lambda/${event.name}`

  const result = await cloudwatchlogs.startQuery({
    endTime,
    queryString: `
        filter @type = "REPORT"
        | stats max(@memorySize / 1024 / 1024) as provisionedMemoryMB,
          max(@maxMemoryUsed / 1024 / 1024) as maxMemoryUsedMB,
          provisionedMemoryMB - maxMemoryUsedMB as overProvisionedMB
      `,
    startTime,
    logGroupName,
  })

  console.info(`Query started for "${event.name}", with id: ${result.queryId}`)

  return {
    ...event,
    queryId: result.queryId,
  }
}
