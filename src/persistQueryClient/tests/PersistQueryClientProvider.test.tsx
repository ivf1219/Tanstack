import React from 'react'
import { render, waitFor } from '@testing-library/react'

import { QueryClient, useQuery, UseQueryResult, useQueries } from '../..'
import { queryKey } from '../../reactjs/tests/utils'
import { sleep } from '../../core/utils'
import { PersistedClient, Persister, persistQueryClientSave } from '../persist'
import { PersistQueryClientProvider } from '../PersistQueryClientProvider'

const createMockPersister = (): Persister => {
  let storedState: PersistedClient | undefined

  return {
    async persistClient(persistClient: PersistedClient) {
      storedState = persistClient
    },
    async restoreClient() {
      await sleep(10)
      return storedState
    },
    removeClient() {
      storedState = undefined
    },
  }
}

describe('PersistQueryClientProvider', () => {
  test('restores cache from persister', async () => {
    const key = queryKey()
    const states: UseQueryResult<string>[] = []

    const queryClient = new QueryClient()
    await queryClient.prefetchQuery(key, () => Promise.resolve('hydrated'))

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    function Page() {
      const state = useQuery(key, async () => {
        await sleep(10)
        return 'fetched'
      })

      states.push(state)

      return (
        <div>
          <h1>{state.data}</h1>
          <h2>fetchStatus: {state.fetchStatus}</h2>
        </div>
      )
    }

    const rendered = render(
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <Page />
      </PersistQueryClientProvider>
    )

    await waitFor(() => rendered.getByText('fetchStatus: idle'))
    await waitFor(() => rendered.getByText('hydrated'))
    await waitFor(() => rendered.getByText('fetched'))

    expect(states).toHaveLength(4)

    expect(states[0]).toMatchObject({
      status: 'loading',
      fetchStatus: 'idle',
      data: undefined,
    })

    expect(states[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states[3]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'fetched',
    })
  })

  test('should also put useQueries into idle state', async () => {
    const key = queryKey()
    const states: UseQueryResult[] = []

    const queryClient = new QueryClient()
    await queryClient.prefetchQuery(key, () => Promise.resolve('hydrated'))

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    function Page() {
      const [state] = useQueries({
        queries: [
          {
            queryKey: key,
            queryFn: async (): Promise<string> => {
              await sleep(10)
              return 'fetched'
            },
          },
        ],
      })

      states.push(state)

      return (
        <div>
          <h1>{state.data}</h1>
          <h2>fetchStatus: {state.fetchStatus}</h2>
        </div>
      )
    }

    const rendered = render(
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <Page />
      </PersistQueryClientProvider>
    )

    await waitFor(() => rendered.getByText('fetchStatus: idle'))
    await waitFor(() => rendered.getByText('hydrated'))
    await waitFor(() => rendered.getByText('fetched'))

    expect(states).toHaveLength(4)

    expect(states[0]).toMatchObject({
      status: 'loading',
      fetchStatus: 'idle',
      data: undefined,
    })

    expect(states[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states[3]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'fetched',
    })
  })

  test('should show initialData while restoring', async () => {
    const key = queryKey()
    const states: UseQueryResult<string>[] = []

    const queryClient = new QueryClient()
    await queryClient.prefetchQuery(key, () => Promise.resolve('hydrated'))

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    function Page() {
      const state = useQuery(
        key,
        async () => {
          await sleep(10)
          return 'fetched'
        },
        {
          initialData: 'initial',
          // make sure that initial data is older than the hydration data
          // otherwise initialData would be newer and takes precedence
          initialDataUpdatedAt: 1,
        }
      )

      states.push(state)

      return (
        <div>
          <h1>{state.data}</h1>
          <h2>fetchStatus: {state.fetchStatus}</h2>
        </div>
      )
    }

    const rendered = render(
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <Page />
      </PersistQueryClientProvider>
    )

    await waitFor(() => rendered.getByText('initial'))
    await waitFor(() => rendered.getByText('hydrated'))
    await waitFor(() => rendered.getByText('fetched'))

    expect(states).toHaveLength(4)

    expect(states[0]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'initial',
    })

    expect(states[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states[3]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'fetched',
    })
  })

  test('should not refetch after restoring when data is fresh', async () => {
    const key = queryKey()
    const states: UseQueryResult<string>[] = []

    const queryClient = new QueryClient()
    await queryClient.prefetchQuery(key, () => Promise.resolve('hydrated'))

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    function Page() {
      const state = useQuery(
        key,
        async () => {
          await sleep(10)
          return 'fetched'
        },
        {
          staleTime: Infinity,
        }
      )

      states.push(state)

      return (
        <div>
          <h1>data: {state.data ?? 'null'}</h1>
          <h2>fetchStatus: {state.fetchStatus}</h2>
        </div>
      )
    }

    const rendered = render(
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <Page />
      </PersistQueryClientProvider>
    )

    await waitFor(() => rendered.getByText('data: null'))
    await waitFor(() => rendered.getByText('data: hydrated'))

    expect(states).toHaveLength(3)

    expect(states[0]).toMatchObject({
      status: 'loading',
      fetchStatus: 'idle',
      data: undefined,
    })

    expect(states[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'hydrated',
    })

    expect(states[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'hydrated',
    })
  })

  test('should call onSuccess after successful restoring', async () => {
    const key = queryKey()

    const queryClient = new QueryClient()
    await queryClient.prefetchQuery(key, () => Promise.resolve('hydrated'))

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    function Page() {
      const state = useQuery(key, async () => {
        await sleep(10)
        return 'fetched'
      })

      return (
        <div>
          <h1>{state.data}</h1>
          <h2>fetchStatus: {state.fetchStatus}</h2>
        </div>
      )
    }

    const onSuccess = jest.fn()

    const rendered = render(
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
        onSuccess={onSuccess}
      >
        <Page />
      </PersistQueryClientProvider>
    )
    expect(onSuccess).toHaveBeenCalledTimes(0)

    await waitFor(() => rendered.getByText('hydrated'))
    expect(onSuccess).toHaveBeenCalledTimes(1)
    await waitFor(() => rendered.getByText('fetched'))
  })
})
