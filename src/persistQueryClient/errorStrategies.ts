import { PersistedClient } from './persist'

export type PersistErrorHandler = (props: {
  persistedClient: PersistedClient
  error: Error
  errorCount: number
}) => PersistedClient | null

export const removeOldestQuery: PersistErrorHandler = ({ persistedClient }) => {
  const mutations = [...persistedClient.clientState.mutations]
  const queries = [...persistedClient.clientState.queries]
  const client: PersistedClient = {
    ...persistedClient,
    clientState: { mutations, queries },
  }

  // sort queries by dataUpdatedAt (oldest first)
  const sortedQueries = [...queries].sort(
    (a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt
  )

  // clean oldest query
  if (sortedQueries.length > 0) {
    const oldestData = sortedQueries.shift()
    client.clientState.queries = queries.filter(q => q !== oldestData)
    return client
  }

  return null
}
