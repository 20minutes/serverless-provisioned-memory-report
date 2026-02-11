import { IncomingWebhook } from '@slack/webhook'
import { handler } from '../functions/reportToSlack.js'

process.env.CLOUDWATCH_LOGS_PARALLEL_QUERIES = 20

vi.mock('@slack/webhook', () => {
  const mSlack = {
    send: vi.fn(),
  }

  return {
    IncomingWebhook: vi.fn(function IncomingWebhookMock() {
      return mSlack
    }),
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Report To Slack', () => {
  let webhook
  beforeAll(() => {
    webhook = new IncomingWebhook()
  })

  it('should handle basic report', async () => {
    const event = {
      prefix: undefined,
      lambdasLimitReached: false,
      channel: '#report',
      days: 7,
      functions: [
        {
          name: 'service1-env-function-1',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
          provisonedMemoryMB: '286',
          maxMemoryUsedMB: '246',
          overProvisionedMB: '40',
          running: false,
        },
      ],
    }

    const result = await handler(event)
    expect(result).toBe('Message sent')

    const mockCalls = webhook.send.mock.calls[0][0]
    expect(mockCalls.link_names).toBe(false)
    expect(mockCalls.unfurl_links).toBe(false)
    expect(mockCalls.unfurl_media).toBe(true)
    expect(mockCalls.username).toBe('Memory Provisioned Report')
    expect(mockCalls.blocks).toHaveLength(3)

    expect(mockCalls.blocks[1].type).toBe('section')
    expect(mockCalls.blocks[1].text.text).toBe(
      'That report is based on logs from the past *7* days.'
    )
    expect(mockCalls.blocks[1].text.type).toBe('mrkdwn')
  })

  it('should handle when function as no data report', async () => {
    const event = {
      prefix: undefined,
      lambdasLimitReached: false,
      days: 10,
      functions: [
        {
          name: 'service1-env-function-1',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
          provisonedMemoryMB: '286',
          maxMemoryUsedMB: '246',
          overProvisionedMB: '40',
          running: false,
        },
        {
          name: 'service1-env-function-2',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
          provisonedMemoryMB: 0,
          maxMemoryUsedMB: 0,
          overProvisionedMB: 0,
          running: false,
        },
      ],
    }

    const result = await handler(event)
    expect(result).toBe('Message sent')

    const mockCalls = webhook.send.mock.calls[0][0]
    expect(mockCalls.link_names).toBe(false)
    expect(mockCalls.unfurl_links).toBe(false)
    expect(mockCalls.unfurl_media).toBe(true)
    expect(mockCalls.username).toBe('Memory Provisioned Report')
    expect(mockCalls.blocks).toHaveLength(4)

    expect(mockCalls.blocks[1].type).toBe('section')
    expect(mockCalls.blocks[1].text.text).toBe(
      'That report is based on logs from the past *10* days.'
    )
    expect(mockCalls.blocks[1].text.type).toBe('mrkdwn')

    expect(mockCalls.blocks[2].text.text).toEqual(
      expect.stringContaining('service1-env-function-1')
    )
    expect(mockCalls.blocks[2].text.text).toEqual(
      expect.not.stringContaining('service1-env-function-2')
    )

    expect(mockCalls.blocks[3].type).toBe('section')
    expect(mockCalls.blocks[3].text.text).toBe(
      'We did not found data for *1* functions (`service1-env-function-2`).'
    )
    expect(mockCalls.blocks[3].text.type).toBe('mrkdwn')
  })

  it('should handle report with prefix', async () => {
    const event = {
      prefix: 'service1-env-',
      lambdasLimitReached: false,
      functions: [
        {
          name: 'service1-env-function-1',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
          provisonedMemoryMB: '286',
          maxMemoryUsedMB: '246',
          overProvisionedMB: '40',
          running: false,
        },
      ],
    }

    const result = await handler(event)
    expect(result).toBe('Message sent')

    const mockCalls = webhook.send.mock.calls[0][0]
    expect(mockCalls.link_names).toBe(false)
    expect(mockCalls.unfurl_links).toBe(false)
    expect(mockCalls.unfurl_media).toBe(true)
    expect(mockCalls.username).toBe('Memory Provisioned Report')
    expect(mockCalls.blocks).toHaveLength(4)

    expect(mockCalls.blocks[2].type).toBe('section')
    expect(mockCalls.blocks[2].text.text).toBe(
      'It only includes functions starting with: `service1-env-`.'
    )
    expect(mockCalls.blocks[2].text.type).toBe('mrkdwn')

    expect(mockCalls.blocks[3].text.text).toEqual(expect.not.stringContaining('service1-env-'))
    expect(mockCalls.blocks[3].text.text).toEqual(expect.stringContaining('function-1'))
  })

  it('should handle report when too much lambdas were found', async () => {
    const event = {
      prefix: undefined,
      lambdasLimitReached: 2,
      functions: [
        {
          name: 'service1-env-function-1',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
          provisonedMemoryMB: '286',
          maxMemoryUsedMB: '246',
          overProvisionedMB: '40',
          running: false,
        },
      ],
    }

    const result = await handler(event)
    expect(result).toBe('Message sent')

    const mockCalls = webhook.send.mock.calls[0][0]
    expect(mockCalls.link_names).toBe(false)
    expect(mockCalls.unfurl_links).toBe(false)
    expect(mockCalls.unfurl_media).toBe(true)
    expect(mockCalls.username).toBe('Memory Provisioned Report')
    expect(mockCalls.blocks).toHaveLength(4)

    expect(mockCalls.blocks[3].text.text).toBe(
      'We found *2* functions, but we can only handle the first 20 of them.'
    )
  })

  it('should handle report when pagination is enabled', async () => {
    const event = {
      prefix: undefined,
      page: 2,
      totalPages: 6,
      lambdasLimitReached: 108,
      functions: [
        {
          name: 'service1-env-function-1',
          memorySize: 300,
          queryId: 'd992b1d7-d217-440e-834d-ca3fab97fd58',
          provisonedMemoryMB: '286',
          maxMemoryUsedMB: '246',
          overProvisionedMB: '40',
          running: false,
        },
      ],
    }

    const result = await handler(event)
    expect(result).toBe('Message sent')

    const mockCalls = webhook.send.mock.calls[0][0]
    expect(mockCalls.link_names).toBe(false)
    expect(mockCalls.unfurl_links).toBe(false)
    expect(mockCalls.unfurl_media).toBe(true)
    expect(mockCalls.username).toBe('Memory Provisioned Report')
    expect(mockCalls.blocks).toHaveLength(4)

    expect(mockCalls.blocks[3].text.text).toBe(
      'You are viewing page 2 on 6 (on a total of 108 functions)'
    )
  })
})
