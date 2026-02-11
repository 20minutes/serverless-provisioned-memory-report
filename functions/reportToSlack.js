import slackTable from 'slack-table'
import { IncomingWebhook } from '@slack/webhook'

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL || '')

export async function handler(event, context, callback) {
  const data = {
    title: 'TOBEREMOVED',
    columns: [
      { width: 40, title: 'Function', dataIndex: 'func' },
      { width: 8, title: 'Defined', dataIndex: 'defined', align: 'right' },
      { width: 11, title: 'Provisioned', dataIndex: 'provisioned', align: 'right' },
      { width: 8, title: 'Max', dataIndex: 'max', align: 'right' },
      { width: 8, title: 'Over', dataIndex: 'over', align: 'right' },
    ],
    dataSource: [],
  }
  data.dataSource.push('-')

  const noData = []

  event.functions.forEach((report) => {
    const func = report.name.replace(event.prefix, '')

    if (report.maxMemoryUsedMB === 0) {
      noData.push(func)
    } else {
      data.dataSource.push({
        func,
        defined: report.memorySize,
        provisioned: Math.round(report.provisonedMemoryMB),
        max: Math.round(report.maxMemoryUsedMB),
        over: Math.round(report.overProvisionedMB),
      })
    }
  })

  const payload = {
    link_names: false,
    unfurl_links: false,
    unfurl_media: true,
    icon_emoji: ':face_with_monocle:',
    username: 'Memory Provisioned Report',
    channel: event.channel,
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'New report available',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `That report is based on logs from the past *${event.days}* days.`,
      },
    },
  ]

  if (event?.prefix) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `It only includes functions starting with: \`${event?.prefix}\`.`,
      },
    })
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      // we don't want the title, we handle it ourself using a `header` block
      text: slackTable(data).replace('*TOBEREMOVED*\n', ''),
    },
  })

  if (event?.lambdasLimitReached !== false) {
    if (event?.page > 1 && event?.totalPages) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `You are viewing page ${event.page} on ${event.totalPages} (on a total of ${event?.lambdasLimitReached} functions)`,
        },
      })
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `We found *${event?.lambdasLimitReached}* functions, but we can only handle the first ${process.env.CLOUDWATCH_LOGS_PARALLEL_QUERIES} of them.`,
        },
      })
    }
  }

  if (noData.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `We did not found data for *${noData.length}* functions (\`${noData.join('`, `')}\`).`,
      },
    })
  }

  await webhook.send({
    ...payload,
    blocks,
  })

  return callback(null, 'Message sent')
}
