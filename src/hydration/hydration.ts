import { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } from '../core/config'

import type { Query, QueryCache, QueryKey, QueryConfig } from 'react-query'

export interface DehydratedQueryConfig<TResult> {
  staleTime?: number
  cacheTime?: number
  initialData?: TResult
}

export interface DehydratedQuery<TResult> {
  config: DehydratedQueryConfig<TResult>
  updatedAt: number
}

export interface DehydratedQueries<TResult> {
  [hash: string]: DehydratedQuery<TResult>
}

export type QueryKeyParserFunction = (queryHash: string) => QueryKey
export type ShouldHydrateFunction = <TResult>({
  queryKey,
  updatedAt,
  staleTime,
  cacheTime,
  data,
}: {
  queryKey: QueryKey
  updatedAt: number
  staleTime: number
  cacheTime: number
  data?: TResult
}) => boolean
export interface HydrateConfig {
  queryKeyParserFn?: QueryKeyParserFunction
  shouldHydrate?: ShouldHydrateFunction
  scheduleTimeoutsManually?: boolean
}

export type ShouldDehydrateFunction = <TResult, TError = unknown>(
  query: Query<TResult, TError>
) => boolean
export interface DehydrateConfig {
  shouldDehydrate?: ShouldDehydrateFunction
}

function dehydrateQuery<TResult, TError = unknown>(
  query: Query<TResult, TError>
): DehydratedQuery<TResult> {
  const dehydratedQuery: DehydratedQuery<TResult> = {
    config: {},
    updatedAt: query.state.updatedAt,
  }

  // Most config is not dehydrated but instead meant to configure again when
  // consuming the de/rehydrated data, typically with useQuery on the client.
  // Sometimes it might make sense to prefetch data on the server and include
  // in the html-payload, but not consume it on the initial render.
  // We still schedule stale and garbage collection right away, which means
  // we need to specifically include staleTime and cacheTime in dehydration.
  if (query.config.staleTime !== DEFAULT_STALE_TIME) {
    dehydratedQuery.config.staleTime = query.config.staleTime
  }
  if (query.config.cacheTime !== DEFAULT_CACHE_TIME) {
    dehydratedQuery.config.cacheTime = query.config.cacheTime
  }
  if (query.state.data !== undefined) {
    dehydratedQuery.config.initialData = query.state.data
  }

  return dehydratedQuery
}

export function dehydrate<TResult>(
  queryCache: QueryCache,
  dehydrateConfig?: DehydrateConfig
): DehydratedQueries<TResult> {
  const config = dehydrateConfig || {}
  const { shouldDehydrate } = config
  const dehydratedQueries: DehydratedQueries<TResult> = {}
  for (const [queryHash, query] of Object.entries(queryCache.queries)) {
    if (query.state.status === 'success') {
      if (shouldDehydrate && !shouldDehydrate(query)) {
        continue
      }
      dehydratedQueries[queryHash] = dehydrateQuery(query)
    }
  }

  return dehydratedQueries
}

export function hydrate<TResult>(
  queryCache: QueryCache,
  dehydratedQueries: unknown,
  hydrateConfig?: HydrateConfig
): () => void {
  const config = hydrateConfig || {}
  const {
    queryKeyParserFn = JSON.parse,
    shouldHydrate,
    scheduleTimeoutsManually = false,
  } = config
  const queriesToInit: string[] = []

  if (typeof dehydratedQueries !== 'object' || dehydratedQueries === null) {
    return () => undefined
  }

  for (const [queryHash, dehydratedQuery] of Object.entries(
    dehydratedQueries
  )) {
    const queryKey = queryKeyParserFn(queryHash)
    const queryConfig: QueryConfig<TResult> = dehydratedQuery.config

    if (
      shouldHydrate &&
      !shouldHydrate({
        queryKey,
        updatedAt: dehydratedQuery.updatedAt,
        staleTime: queryConfig.staleTime || DEFAULT_STALE_TIME,
        cacheTime: queryConfig.cacheTime || DEFAULT_CACHE_TIME,
        data: queryConfig.initialData,
      })
    ) {
      continue
    }

    queryCache.buildQuery(queryKey, queryConfig)
    const query = queryCache.queries[queryHash]
    query.state.updatedAt = dehydratedQuery.updatedAt

    if (scheduleTimeoutsManually) {
      // We avoid keeping a reference to the query itself here since
      // that would mean the query could not be garbage collected as
      // long as someone kept a reference to the initQueries-function
      queriesToInit.push(queryHash)
    } else {
      query.activateTimeouts()
    }
  }

  return function activateTimeouts() {
    while (queriesToInit.length > 0) {
      const queryHash = queriesToInit.shift()
      if (queryHash) {
        const query = queryCache.queries[queryHash]

        if (query) {
          query.activateTimeouts()
        }
      }
    }
  }
}
