import { mockClient } from 'aws-sdk-client-mock'
import { Lambda } from '@aws-sdk/client-lambda'
import { handler } from '../functions/listLambdas'

const awsMock = mockClient(Lambda)
process.env.CLOUDWATCH_LOGS_PARALLEL_QUERIES = 20

describe('List Lambdas', () => {
  it('should list all lambdas', async () => {
    awsMock.resolves({
      Functions: [
        {
          FunctionName: 'service-env-function-1',
          MemorySize: 768,
        },
        {
          FunctionName: 'service-env-function-3',
          MemorySize: 128,
        },
        {
          FunctionName: 'service-env-function-2',
          MemorySize: 512,
        },
      ],
    })

    const callback = jest.fn()

    await handler({ channel: 'C03PE644XH8' }, {}, callback)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1].functions).toHaveLength(3)
    expect(callbackCalls[1]).toEqual({
      lambdasLimitReached: false,
      prefix: undefined,
      channel: 'C03PE644XH8',
      days: 7,
      page: 1,
      functions: [
        { name: 'service-env-function-1', memorySize: 768, days: 7 },
        { name: 'service-env-function-2', memorySize: 512, days: 7 },
        { name: 'service-env-function-3', memorySize: 128, days: 7 },
      ],
    })
  })

  it('should list all lambdas filtered by prefix', async () => {
    awsMock.resolves({
      Functions: [
        {
          FunctionName: 'service1-env-function-1',
          MemorySize: 768,
        },
        {
          FunctionName: 'service1-env-function-3',
          MemorySize: 128,
        },
        {
          FunctionName: 'service2-env-function-1',
          MemorySize: 512,
        },
      ],
    })

    const callback = jest.fn()

    await handler({ prefix: 'service2', days: 70 }, {}, callback)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1].functions).toHaveLength(1)
    expect(callbackCalls[1]).toEqual({
      lambdasLimitReached: false,
      prefix: 'service2',
      channel: '#general',
      days: 70,
      page: 1,
      functions: [{ name: 'service2-env-function-1', memorySize: 512, days: 70 }],
    })
  })

  it('should list only first 20 lambdas', async () => {
    const functions = []
    for (let i = 0; i < 30; i += 1) {
      const rand = Math.floor(Math.random() * 3000)
      functions.push({
        FunctionName: `service1-env-function-${rand}`,
        MemorySize: rand,
      })
    }

    awsMock.resolves({
      Functions: functions,
    })

    const callback = jest.fn()

    await handler({}, {}, callback)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1].functions).toHaveLength(20)
    expect(callbackCalls[1].lambdasLimitReached).toBe(30)
  })

  it('should list second page', async () => {
    const functions = []
    for (let i = 0; i < 30; i += 1) {
      const rand = Math.floor(Math.random() * 3000)
      functions.push({
        FunctionName: `service1-env-function-${rand}`,
        MemorySize: rand,
      })
    }

    awsMock.resolves({
      Functions: functions,
    })

    const callback = jest.fn()

    await handler({ page: 2 }, {}, callback)

    const callbackCalls = callback.mock.calls[0]
    expect(callbackCalls[0]).toBe(null)
    expect(callbackCalls[1].functions).toHaveLength(10)
    expect(callbackCalls[1].lambdasLimitReached).toBe(30)
    expect(callbackCalls[1].page).toBe(2)
    expect(callbackCalls[1].totalPages).toBe(2)
  })
})
