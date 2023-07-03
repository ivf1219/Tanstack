import type {
  QueryKey,
  QueryFunction,
  QueryClient,
  QueriesPlaceholderDataFunction,
  QueryObserverResult,
  DefaultError,
  QueriesObserverOptions,
  QueryObserverOptions,
} from '@tanstack/query-core'
import { notifyManager, QueriesObserver } from '@tanstack/query-core'
import { derived, get, readable, type Readable } from 'svelte/store'
import type { StoreOrVal } from './types'
import { useQueryClient } from './useQueryClient'
import { isSvelteStore } from './utils'

// This defines the `CreateQueryOptions` that are accepted in `QueriesOptions` & `GetOptions`.
// `placeholderData` function does not have a parameter
type QueryObserverOptionsForCreateQueries<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  QueryObserverOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>,
  'placeholderData'
> & {
  placeholderData?: TQueryFnData | QueriesPlaceholderDataFunction<TQueryFnData>
}

// Avoid TS depth-limit error in case of large array literal
type MAXIMUM_DEPTH = 20

type GetOptions<T> =
  // Part 1: responsible for applying explicit type parameter to function arguments, if object { queryFnData: TQueryFnData, error: TError, data: TData }
  T extends {
    queryFnData: infer TQueryFnData
    error?: infer TError
    data: infer TData
  }
    ? QueryObserverOptionsForCreateQueries<TQueryFnData, TError, TData>
    : T extends { queryFnData: infer TQueryFnData; error?: infer TError }
    ? QueryObserverOptionsForCreateQueries<TQueryFnData, TError>
    : T extends { data: infer TData; error?: infer TError }
    ? QueryObserverOptionsForCreateQueries<unknown, TError, TData>
    : // Part 2: responsible for applying explicit type parameter to function arguments, if tuple [TQueryFnData, TError, TData]
    T extends [infer TQueryFnData, infer TError, infer TData]
    ? QueryObserverOptionsForCreateQueries<TQueryFnData, TError, TData>
    : T extends [infer TQueryFnData, infer TError]
    ? QueryObserverOptionsForCreateQueries<TQueryFnData, TError>
    : T extends [infer TQueryFnData]
    ? QueryObserverOptionsForCreateQueries<TQueryFnData>
    : // Part 3: responsible for inferring and enforcing type if no explicit parameter was provided
    T extends {
        queryFn?: QueryFunction<infer TQueryFnData, infer TQueryKey>
        select: (data: any) => infer TData
      }
    ? QueryObserverOptionsForCreateQueries<
        TQueryFnData,
        Error,
        TData,
        TQueryKey
      >
    : T extends { queryFn?: QueryFunction<infer TQueryFnData, infer TQueryKey> }
    ? QueryObserverOptionsForCreateQueries<
        TQueryFnData,
        Error,
        TQueryFnData,
        TQueryKey
      >
    : // Fallback
      QueryObserverOptionsForCreateQueries

type GetResults<T> =
  // Part 1: responsible for mapping explicit type parameter to function result, if object
  T extends { queryFnData: any; error?: infer TError; data: infer TData }
    ? QueryObserverResult<TData, TError>
    : T extends { queryFnData: infer TQueryFnData; error?: infer TError }
    ? QueryObserverResult<TQueryFnData, TError>
    : T extends { data: infer TData; error?: infer TError }
    ? QueryObserverResult<TData, TError>
    : // Part 2: responsible for mapping explicit type parameter to function result, if tuple
    T extends [any, infer TError, infer TData]
    ? QueryObserverResult<TData, TError>
    : T extends [infer TQueryFnData, infer TError]
    ? QueryObserverResult<TQueryFnData, TError>
    : T extends [infer TQueryFnData]
    ? QueryObserverResult<TQueryFnData>
    : // Part 3: responsible for mapping inferred type to results, if no explicit parameter was provided
    T extends {
        queryFn?: QueryFunction<unknown, any>
        select: (data: any) => infer TData
      }
    ? QueryObserverResult<TData>
    : T extends { queryFn?: QueryFunction<infer TQueryFnData, any> }
    ? QueryObserverResult<TQueryFnData>
    : // Fallback
      QueryObserverResult

/**
 * QueriesOptions reducer recursively unwraps function arguments to infer/enforce type param
 */
export type QueriesOptions<
  T extends any[],
  Result extends any[] = [],
  Depth extends ReadonlyArray<number> = [],
> = Depth['length'] extends MAXIMUM_DEPTH
  ? QueryObserverOptionsForCreateQueries[]
  : T extends []
  ? []
  : T extends [infer Head]
  ? [...Result, GetOptions<Head>]
  : T extends [infer Head, ...infer Tail]
  ? QueriesOptions<[...Tail], [...Result, GetOptions<Head>], [...Depth, 1]>
  : unknown[] extends T
  ? T
  : // If T is *some* array but we couldn't assign unknown[] to it, then it must hold some known/homogenous type!
  // use this to infer the param types in the case of Array.map() argument
  T extends QueryObserverOptionsForCreateQueries<
      infer TQueryFnData,
      infer TError,
      infer TData,
      infer TQueryKey
    >[]
  ? QueryObserverOptionsForCreateQueries<
      TQueryFnData,
      TError,
      TData,
      TQueryKey
    >[]
  : // Fallback
    QueryObserverOptionsForCreateQueries[]

/**
 * QueriesResults reducer recursively maps type param to results
 */
export type QueriesResults<
  T extends any[],
  Result extends any[] = [],
  Depth extends ReadonlyArray<number> = [],
> = Depth['length'] extends MAXIMUM_DEPTH
  ? QueryObserverResult[]
  : T extends []
  ? []
  : T extends [infer Head]
  ? [...Result, GetResults<Head>]
  : T extends [infer Head, ...infer Tail]
  ? QueriesResults<[...Tail], [...Result, GetResults<Head>], [...Depth, 1]>
  : T extends QueryObserverOptionsForCreateQueries<
      infer TQueryFnData,
      infer TError,
      infer TData,
      any
    >[]
  ? // Dynamic-size (homogenous) CreateQueryOptions array: map directly to array of results
    QueryObserverResult<
      unknown extends TData ? TQueryFnData : TData,
      unknown extends TError ? DefaultError : TError
    >[]
  : // Fallback
    QueryObserverResult[]

export function createQueries<
  T extends any[],
  TCombinedResult = QueriesResults<T>,
>(
  {
    queries,
    ...options
  }: {
    queries: StoreOrVal<[...QueriesOptions<T>]>
    combine?: (result: QueriesResults<T>) => TCombinedResult
  },
  queryClient?: QueryClient,
): Readable<TCombinedResult> {
  const client = useQueryClient(queryClient)
  // const isRestoring = useIsRestoring()

  const queriesStore = isSvelteStore(queries) ? queries : readable(queries)

  const defaultedQueriesStore = derived(queriesStore, ($queries) => {
    return $queries.map((opts) => {
      const defaultedOptions = client.defaultQueryOptions(opts)
      // Make sure the results are already in fetching state before subscribing or updating options
      defaultedOptions._optimisticResults = 'optimistic'

      return defaultedOptions
    })
  })
  const observer = new QueriesObserver<TCombinedResult>(
    client,
    get(defaultedQueriesStore),
    options as QueriesObserverOptions<TCombinedResult>,
  )

  defaultedQueriesStore.subscribe(($defaultedQueries) => {
    // Do not notify on updates because of changes in the options because
    // these changes should already be reflected in the optimistic result.
    observer.setQueries(
      $defaultedQueries,
      options as QueriesObserverOptions<TCombinedResult>,
      { listeners: false },
    )
  })

  const [, getCombinedResult] = observer.getOptimisticResult(
    get(defaultedQueriesStore),
  )

  const { subscribe } = readable(getCombinedResult() as any, (set) => {
    return observer.subscribe(notifyManager.batchCalls(set))
  })

  return { subscribe }
}
