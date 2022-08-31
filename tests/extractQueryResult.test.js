import { handler } from '../functions/extractQueryResult'

const mockCloudWatchLogsGetQueryResults = jest.fn()

jest.mock('aws-sdk', () => ({
  CloudWatchLogs: jest.fn(() => ({
    getQueryResults: mockCloudWatchLogsGetQueryResults,
  })),
}))

beforeEach(() => {
  mockCloudWatchLogsGetQueryResults.mockReset()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Extract Query Result', () => {
  it('should handle a running query', async () => {
    mockCloudWatchLogsGetQueryResults.mockImplementation(() => ({
      promise: () => ({
        status: 'Running',
      }),
    }))

    const callback = jest.fn()
    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    }

    await handler(event, {}, callback)

    expect(mockCloudWatchLogsGetQueryResults).toHaveBeenCalledTimes(1)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1]).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
      running: true,
    })
  })

  it('should handle a completed query', async () => {
    mockCloudWatchLogsGetQueryResults.mockImplementation(() => ({
      promise: () => ({
        status: 'Complete',
        results: [
          [
            {
              field: 'provisonedMemoryMB',
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
      }),
    }))

    const callback = jest.fn()
    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    }

    await handler(event, {}, callback)

    expect(mockCloudWatchLogsGetQueryResults).toHaveBeenCalledTimes(1)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1]).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
      provisonedMemoryMB: 286,
      maxMemoryUsedMB: 246,
      overProvisionedMB: 40,
      running: false,
    })
  })
})
