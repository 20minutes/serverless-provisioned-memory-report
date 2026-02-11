import { mockClient } from 'aws-sdk-client-mock'
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'
import { handler } from '../functions/startQuery.js'

const awsMock = mockClient(CloudWatchLogs)

describe('Start Query', () => {
  it('should start the query', async () => {
    awsMock.resolves({
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })

    const callback = vi.fn()
    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
    }

    await handler(event, {}, callback)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1]).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })
  })
})
