import { Lambda } from '@aws-sdk/client-lambda'

export async function handler(event, context, callback) {
  // which is also the limit of queries to run in parallel on CloudWatchLogs
  const numberPerPage = process.env.CLOUDWATCH_LOGS_PARALLEL_QUERIES
  const lambda = new Lambda()
  let result
  const functions = []
  const days = event?.days ?? 7
  const page = event?.page ?? 1

  do {
    // eslint-disable-next-line no-await-in-loop
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

  if (page > totalPages) {
    console.error(`Given page ${page} is too hight. Total pages: ${totalPages}`)

    return callback('Page is too hight')
  }

  if (page > 1) {
    console.log(`Found ${nbLambdas} functions, return page ${page} on ${totalPages}.`)

    return callback(null, {
      ...options,
      totalPages,
      lambdasLimitReached: nbLambdas,
      functions: filteredFunctions.slice(
        page * numberPerPage - numberPerPage,
        page * numberPerPage
      ),
    })
  }
  if (nbLambdas > numberPerPage) {
    console.log(
      `Found ${nbLambdas} functions, but only the first ${numberPerPage} will be handled.`
    )

    return callback(null, {
      ...options,
      lambdasLimitReached: nbLambdas,
      functions: filteredFunctions.slice(0, numberPerPage),
    })
  }

  console.log(`Found ${nbLambdas} functions`)

  // return the functions list to start a log insight query
  return callback(null, {
    ...options,
    lambdasLimitReached: false,
    functions: filteredFunctions,
  })
}
