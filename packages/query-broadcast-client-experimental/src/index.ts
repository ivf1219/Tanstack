import { BroadcastChannel } from 'broadcast-channel'
import type { BroadcastChannelOptions } from 'broadcast-channel'
import type { QueryClient } from '@tanstack/query-core'

interface BroadcastQueryClientOptions {
  queryClient: QueryClient
  broadcastChannel?: string
  type?: BroadcastChannelOptions['type']
}

export function broadcastQueryClient({
  queryClient,
  broadcastChannel = 'tanstack-query',
  type,
}: BroadcastQueryClientOptions) {
  let transaction = false
  const tx = (cb: () => void) => {
    transaction = true
    cb()
    transaction = false
  }

  const channel = new BroadcastChannel(broadcastChannel, {
    type,
    webWorkerSupport: false,
  })

  const queryCache = queryClient.getQueryCache()

  queryClient.getQueryCache().subscribe((queryEvent) => {
    if (transaction) {
      return
    }

    const {
      query: { queryHash, queryKey, state },
    } = queryEvent

    if (queryEvent.type === 'updated' && queryEvent.action.type === 'success') {
      channel.postMessage({
        type: 'updated',
        queryHash,
        queryKey,
        state,
      })
    }

    if (queryEvent.type === 'removed') {
      channel.postMessage({
        type: 'removed',
        queryHash,
        queryKey,
      })
    }
  })

  channel.onmessage = (action) => {
    if (!action?.type) {
      return
    }

    tx(() => {
      const { type, queryHash, queryKey, state } = action

      if (type === 'updated') {
        const query = queryCache.get(queryHash)

        if (query) {
          query.setState(state)
          return
        }

        queryCache.build(
          queryClient,
          {
            queryKey,
            queryHash,
          },
          state,
        )
      } else if (type === 'removed') {
        const query = queryCache.get(queryHash)

        if (query) {
          queryCache.remove(query)
        }
      }
    })
  }
}
