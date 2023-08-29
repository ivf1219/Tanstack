import { onScopeDispose, ref, watchSyncEffect } from 'vue-demi'
import { useQueryClient } from './useQueryClient'
import type { Ref } from 'vue-demi'
import type { QueryFilters as QF } from '@tanstack/query-core'
import type { MaybeRefDeep } from './types'
import type { QueryClient } from './queryClient'

export type QueryFilters = MaybeRefDeep<QF>

export function useIsFetching(
  fetchingFilters: MaybeRefDeep<QF> = {},
  queryClient?: QueryClient,
): Ref<number> {
  const client = queryClient || useQueryClient()

  const isFetching = ref()

  const listener = () => {
    isFetching.value = client.isFetching(fetchingFilters)
  }

  const unsubscribe = client.getQueryCache().subscribe(listener)

  watchSyncEffect(listener)

  onScopeDispose(() => {
    unsubscribe()
  })

  return isFetching
}
