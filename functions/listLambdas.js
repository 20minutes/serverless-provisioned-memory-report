import AWS from 'aws-sdk'

export async function handler(event, context, callback) {
  const lambda = new AWS.Lambda()
  let result
  const functions = []
  const days = event?.days ?? 7

  do {
    // eslint-disable-next-line no-await-in-loop
    result = await lambda
      .listFunctions({
        Marker: result?.NextMarker ?? null,
      })
      .promise()

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
  }

  let filteredFunctions = functions
  if (event.prefix) {
    filteredFunctions = functions.filter((item) => item.name.startsWith(event.prefix))
  }

  if (filteredFunctions.length > 20) {
    console.log(
      `Found ${filteredFunctions.length} functions, but only the first 20 will be handled.`
    )

    return callback(null, {
      ...options,
      lambdasLimitReached: filteredFunctions.length,
      functions: filteredFunctions.slice(0, 20),
    })
  }

  console.log(`Found ${filteredFunctions.length} functions`)

  // return the functions list to start a log insight query
  return callback(null, {
    ...options,
    lambdasLimitReached: false,
    functions: filteredFunctions,
  })
}
