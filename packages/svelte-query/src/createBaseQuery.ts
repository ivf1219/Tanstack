import type { QueryClient, QueryKey, QueryObserver } from '@tanstack/query-core'
import { notifyManager } from '@tanstack/query-core'
import type {
  CreateBaseQueryOptions,
  CreateBaseQueryResult,
  WritableOrVal,
} from './types'
import { useQueryClient } from './useQueryClient'
import { derived, get, readable, writable } from 'svelte/store'
import { isWritable } from './utils'

export function createBaseQuery<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
>(
  options: WritableOrVal<
    CreateBaseQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >,
  Observer: typeof QueryObserver,
  queryClient?: QueryClient,
): CreateBaseQueryResult<TData, TError> {
  const client = useQueryClient(queryClient)

  const optionsStore = isWritable(options) ? options : writable(options)

  const defaultedOptionsStore = derived(optionsStore, ($options) => {
    const defaultedOptions = client.defaultQueryOptions($options)
    defaultedOptions._optimisticResults = 'optimistic'

    // Include callbacks in batch renders
    if (defaultedOptions.onError) {
      defaultedOptions.onError = notifyManager.batchCalls(
        defaultedOptions.onError,
      )
    }

    if (defaultedOptions.onSuccess) {
      defaultedOptions.onSuccess = notifyManager.batchCalls(
        defaultedOptions.onSuccess,
      )
    }

    if (defaultedOptions.onSettled) {
      defaultedOptions.onSettled = notifyManager.batchCalls(
        defaultedOptions.onSettled,
      )
    }

    return defaultedOptions
  })

  const observer = new Observer<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >(client, get(defaultedOptionsStore))

  defaultedOptionsStore.subscribe(($defaultedOptions) => {
    // Do not notify on updates because of changes in the options because
    // these changes should already be reflected in the optimistic result.
    observer.setOptions($defaultedOptions, { listeners: false })
  })

  const result = readable(observer.getCurrentResult(), (set) => {
    return observer.subscribe(notifyManager.batchCalls(set))
  })

  const { subscribe } = derived(result, ($result) => {
    $result = observer.getOptimisticResult(get(defaultedOptionsStore))
    return !get(defaultedOptionsStore).notifyOnChangeProps
      ? observer.trackResult($result)
      : $result
  })

  return { subscribe }
}
