import { CloudWatchLogs, StartQueryCommand } from '@aws-sdk/client-cloudwatch-logs'
import { mockClient } from 'aws-sdk-client-mock'
import { handler } from '../functions/startQuery.js'

const awsMock = mockClient(CloudWatchLogs)

describe('Start Query', () => {
  beforeEach(() => {
    awsMock.reset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-08T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start the query', async () => {
    awsMock.resolves({
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })

    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
      days: 7,
    }

    const result = await handler(event)
    expect(result).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      days: 7,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })

    const startQueryCalls = awsMock.commandCalls(StartQueryCommand)
    expect(startQueryCalls).toHaveLength(1)
    expect(startQueryCalls[0].firstArg.input).toEqual({
      endTime: 1704672000,
      queryString: expect.stringContaining('provisionedMemoryMB'),
      startTime: 1704067200,
      logGroupName: '/aws/lambda/service1-env-function-1',
    })
  })
})
