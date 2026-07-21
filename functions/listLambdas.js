import { Lambda } from '@aws-sdk/client-lambda'

function parsePositiveInteger(value, defaultValue, name, maxValue = Number.POSITIVE_INFINITY) {
  const parsedValue = Number(value ?? defaultValue)

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > maxValue) {
    const maxMessage = Number.isFinite(maxValue) ? ` lower than or equal to ${maxValue}` : ''

    throw new Error(`${name} must be a positive integer${maxMessage}`)
  }

  return parsedValue
}

export async function handler(event = {}) {
  // which is also the limit of queries to run in parallel on CloudWatchLogs
  const numberPerPage = parsePositiveInteger(
    process.env.CLOUDWATCH_LOGS_PARALLEL_QUERIES,
    30,
    'CLOUDWATCH_LOGS_PARALLEL_QUERIES',
    30
  )
  const lambda = new Lambda()
  let result
  const functions = []
  const days = parsePositiveInteger(event.days, 7, 'days', 90)
  const page = parsePositiveInteger(event.page, 1, 'page')

  if (event.prefix !== undefined && typeof event.prefix !== 'string') {
    throw new Error('prefix must be a string')
  }

  if (event.channel !== undefined && typeof event.channel !== 'string') {
    throw new Error('channel must be a string')
  }

  do {
    result = await lambda.listFunctions({
      Marker: result?.NextMarker ?? null,
    })

    result.Functions.forEach((item) => {
      functions.push({
        name: item.FunctionName,
        memorySize: item.MemorySize,
        days,
      })
    })
  } while (result.NextMarker)

  // sort functions by name
  functions.sort((a, b) => {
    if (a.name > b.name) {
      return 1
    }

    if (b.name > a.name) {
      return -1
    }

    return 0
  })

  const options = {
    prefix: event?.prefix,
    channel: event?.channel ?? '#general',
    days,
    page,
  }

  let filteredFunctions = functions
  if (event.prefix) {
    filteredFunctions = functions.filter((item) => item.name.startsWith(event.prefix))
  }

  const nbLambdas = filteredFunctions.length
  const totalPages = Math.ceil(nbLambdas / numberPerPage)

  if (nbLambdas === 0) {
    console.info('Found 0 functions')

    return {
      ...options,
      lambdasLimitReached: false,
      functions: [],
    }
  }

  if (page > totalPages) {
    console.error(`Given page ${page} is too high. Total pages: ${totalPages}`)

    throw new Error('Page is too high')
  }

  if (page > 1) {
    console.info(`Found ${nbLambdas} functions, return page ${page} on ${totalPages}.`)

    return {
      ...options,
      totalPages,
      lambdasLimitReached: nbLambdas,
      functions: filteredFunctions.slice(
        page * numberPerPage - numberPerPage,
        page * numberPerPage
      ),
    }
  }
  if (nbLambdas > numberPerPage) {
    console.warn(
      `Found ${nbLambdas} functions, but only the first ${numberPerPage} will be handled.`
    )

    return {
      ...options,
      lambdasLimitReached: nbLambdas,
      functions: filteredFunctions.slice(0, numberPerPage),
    }
  }

  console.info(`Found ${nbLambdas} functions`)

  // return the functions list to start a log insight query
  return {
    ...options,
    lambdasLimitReached: false,
    functions: filteredFunctions,
  }
}
