import { handler } from '../functions/startQuery'

const mockCloudWatchLogsStartQuery = jest.fn()

jest.mock('aws-sdk', () => ({
  CloudWatchLogs: jest.fn(() => ({
    startQuery: mockCloudWatchLogsStartQuery,
  })),
}))

beforeEach(() => {
  mockCloudWatchLogsStartQuery.mockReset()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Start Query', () => {
  it('should start the query', async () => {
    mockCloudWatchLogsStartQuery.mockImplementation(() => ({
      promise: () => ({
        queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
      }),
    }))

    const callback = jest.fn()
    const event = {
      name: 'service1-env-function-1',
      memorySize: 300,
    }

    await handler(event, {}, callback)

    expect(mockCloudWatchLogsStartQuery).toHaveBeenCalledTimes(1)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1]).toEqual({
      name: 'service1-env-function-1',
      memorySize: 300,
      queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
    })
  })
})
