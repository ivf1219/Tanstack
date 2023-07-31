'use client'
import { InfiniteQueryObserver } from '@tanstack/query-core'
import { useBaseQuery } from './useBaseQuery'
import type {
  InfiniteQueryObserverSuccessResult,
  QueryObserver,
} from '@tanstack/query-core'
import type {
  DefaultError,
  InfiniteData,
  QueryClient,
  QueryKey,
} from '@tanstack/query-core'
import type {
  UseSuspenseInfiniteQueryOptions,
  UseSuspenseInfiniteQueryResult,
} from './types'

export function useSuspenseInfiniteQuery<
  TQueryFnData,
  TError = DefaultError,
  TPageParam = unknown,
  TData = InfiniteData<TQueryFnData, TPageParam>,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseSuspenseInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryFnData,
    TQueryKey,
    TPageParam
  >,
  queryClient?: QueryClient,
): UseSuspenseInfiniteQueryResult<TData, TError> {
  return useBaseQuery(
    {
      ...options,
      enabled: true,
      suspense: true,
      throwOnError: true,
    },
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    InfiniteQueryObserver as typeof QueryObserver,
    queryClient,
  ) as InfiniteQueryObserverSuccessResult<TData, TError>
}
