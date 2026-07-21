import { CloudWatchLogs, GetQueryResultsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { mockClient } from 'aws-sdk-client-mock'
import { handler } from '../functions/extractQueryResult.js'

const awsMock = mockClient(CloudWatchLogs)

describe('Extract Query Result', () => {
  beforeEach(() => {
    awsMock.reset()
  })

  it('should handle a running query', async () => {
    awsMock.resolves({
      status: 'Running',
    })

    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    }

    const result = await handler(event)
    expect(result).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
      running: true,
    })

    expect(awsMock.commandCalls(GetQueryResultsCommand)[0].firstArg.input).toEqual({
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })
  })

  it('should handle a scheduled query', async () => {
    awsMock.resolves({
      status: 'Scheduled',
    })

    const result = await handler({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })

    expect(result.running).toBe(true)
  })

  it('should handle a completed query', async () => {
    awsMock.resolves({
      status: 'Complete',
      results: [
        [
          {
            field: 'provisionedMemoryMB',
            value: 286,
          },
          {
            field: 'maxMemoryUsedMB',
            value: 246,
          },
          {
            field: 'overProvisionedMB',
            value: 40,
          },
        ],
      ],
    })

    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    }

    const result = await handler(event)
    expect(result).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
      provisionedMemoryMB: 286,
      maxMemoryUsedMB: 246,
      overProvisionedMB: 40,
      running: false,
    })
  })

  it.each(['Failed', 'Cancelled', 'Timeout', 'Unknown'])(
    'should fail when query status is %s',
    async (status) => {
      awsMock.resolves({
        status,
      })

      await expect(
        handler({
          name: 'service1-env-function-1',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
        })
      ).rejects.toThrow(`Query "d992b1d7-d217-440e-834d-ca3fab97fd58" ended with status: ${status}`)
    }
  )
})
