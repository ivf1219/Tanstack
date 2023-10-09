import { Injectable, inject } from '@angular/core'
import { QUERY_CLIENT } from './queryClient'
import type { OnDestroy } from '@angular/core'
import type { QueryClient } from '@tanstack/query-core'

/**
 * Takes care of mounting and unmounting the query client.
 * @internal
 */
@Injectable()
export class QueryClientService implements OnDestroy {
  readonly #queryClient: QueryClient | undefined

  constructor() {
    const queryClient = inject(QUERY_CLIENT, { optional: true })
    if (queryClient) {
      this.#queryClient = queryClient
      queryClient.mount()
    }
  }

  useQueryClient(queryClient?: QueryClient) {
    if (queryClient) {
      return queryClient
    }
    if (!this.#queryClient) {
      throw new Error(
        'No query client found. Make sure to call provideAngularQuery',
      )
    }
    return this.#queryClient
  }

  ngOnDestroy() {
    this.#queryClient?.unmount()
  }
}
