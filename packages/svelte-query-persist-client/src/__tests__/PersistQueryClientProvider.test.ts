import { render, waitFor } from '@testing-library/svelte'
import { describe, expect, test } from 'vitest'
import { persistQueryClientSave } from '@tanstack/query-persist-client-core'
import { get, writable } from 'svelte/store'
import FreshData from './FreshData/Provider.svelte'
import InitialData from './InitialData/Provider.svelte'
import RestoreCache from './RestoreCache/Provider.svelte'
import UseQueries from './UseQueries/Provider.svelte'
import { createQueryClient, queryKey, sleep } from './utils'

import type {
  PersistedClient,
  Persister,
} from '@tanstack/query-persist-client-core'
import type { Writable } from 'svelte/store'
import type { StatusResult } from './utils'

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

const createMockErrorPersister = (
  removeClient: Persister['removeClient'],
): [Error, Persister] => {
  const error = new Error('restore failed')
  return [
    error,
    {
      async persistClient() {
        // noop
      },
      async restoreClient() {
        await sleep(10)
        throw error
      },
      removeClient,
    },
  ]
}

describe('PersistQueryClientProvider', () => {
  test('restores cache from persister', async () => {
    const key = queryKey()
    const states: Writable<Array<StatusResult<string>>> = writable([])

    const queryClient = createQueryClient()
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => Promise.resolve('hydrated'),
    })

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    const rendered = render(RestoreCache, {
      props: {
        queryClient,
        persistOptions: { persister },
        key,
        states,
      },
    })

    await waitFor(() => rendered.getByText('fetchStatus: idle'))
    await waitFor(() => rendered.getByText('hydrated'))
    await waitFor(() => rendered.getByText('fetched'))

    const states_ = get(states)
    expect(states_).toHaveLength(4)

    expect(states_[0]).toMatchObject({
      status: 'pending',
      fetchStatus: 'idle',
      data: undefined,
    })

    expect(states_[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states_[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states_[3]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'fetched',
    })
  })

  test('should also put useQueries into idle state', async () => {
    const key = queryKey()
    const states: Writable<Array<StatusResult<string>>> = writable([])

    const queryClient = createQueryClient()
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => Promise.resolve('hydrated'),
    })

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    const rendered = render(UseQueries, {
      props: {
        queryClient,
        persistOptions: { persister },
        key,
        states,
      },
    })

    await waitFor(() => rendered.getByText('fetchStatus: idle'))
    await waitFor(() => rendered.getByText('hydrated'))
    await waitFor(() => rendered.getByText('fetched'))

    const states_ = get(states)

    expect(states_).toHaveLength(4)

    expect(states_[0]).toMatchObject({
      status: 'pending',
      fetchStatus: 'idle',
      data: undefined,
    })

    expect(states_[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states_[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states_[3]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'fetched',
    })
  })

  test('should show initialData while restoring', async () => {
    const key = queryKey()
    const states: Writable<Array<StatusResult<string>>> = writable([])

    const queryClient = createQueryClient()
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => Promise.resolve('hydrated'),
    })

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    const rendered = render(InitialData, {
      props: {
        queryClient,
        persistOptions: { persister },
        key,
        states,
      },
    })

    await waitFor(() => rendered.getByText('initial'))
    await waitFor(() => rendered.getByText('hydrated'))
    await waitFor(() => rendered.getByText('fetched'))

    const states_ = get(states)
    expect(states_).toHaveLength(4)

    expect(states_[0]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'initial',
    })

    expect(states_[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states_[2]).toMatchObject({
      status: 'success',
      fetchStatus: 'fetching',
      data: 'hydrated',
    })

    expect(states_[3]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'fetched',
    })
  })

  test('should not refetch after restoring when data is fresh', async () => {
    const key = queryKey()
    const states: Writable<Array<StatusResult<string>>> = writable([])

    const queryClient = createQueryClient()
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => Promise.resolve('hydrated'),
    })

    const persister = createMockPersister()

    await persistQueryClientSave({ queryClient, persister })

    queryClient.clear()

    const fetched = writable(false)

    const rendered = render(FreshData, {
      props: {
        queryClient,
        persistOptions: { persister },
        key,
        states,
        fetched,
      },
    })

    await waitFor(() => rendered.getByText('data: null'))
    await waitFor(() => rendered.getByText('data: hydrated'))

    const states_ = get(states)
    expect(states_).toHaveLength(2)

    expect(get(fetched)).toBe(false)

    expect(states_[0]).toMatchObject({
      status: 'pending',
      fetchStatus: 'idle',
      data: undefined,
    })

    expect(states_[1]).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: 'hydrated',
    })
  })

  // test('should call onSuccess after successful restoring', async () => {
  //   const key = queryKey()

  //   const queryClient = createQueryClient()
  //   await queryClient.prefetchQuery({
  //     queryKey: key,
  //     queryFn: () => Promise.resolve('hydrated'),
  //   })

  //   const persister = createMockPersister()

  //   await persistQueryClientSave({ queryClient, persister })

  //   queryClient.clear()

  //   function Page() {
  //     const state = useQuery({
  //       queryKey: key,
  //       queryFn: async () => {
  //         await sleep(10)
  //         return 'fetched'
  //       },
  //     })

  //     // return (
  //     //   <div>
  //     //     <h1>{state.data}</h1>
  //     //     <h2>fetchStatus: {state.fetchStatus}</h2>
  //     //   </div>
  //     // )
  //   }

  //   const onSuccess = vi.fn()

  //   const rendered = render
  //   // <PersistQueryClientProvider
  //   //   client={queryClient}
  //   //   persistOptions={{ persister }}
  //   //   onSuccess={onSuccess}
  //   // >
  //   //   <Page />
  //   // </PersistQueryClientProvider>,

  //   expect(onSuccess).toHaveBeenCalledTimes(0)

  //   await waitFor(() => rendered.getByText('hydrated'))
  //   expect(onSuccess).toHaveBeenCalledTimes(1)
  //   await waitFor(() => rendered.getByText('fetched'))
  // })

  // test('should await onSuccess after successful restoring', async () => {
  //   const key = queryKey()

  //   const queryClient = createQueryClient()
  //   await queryClient.prefetchQuery({
  //     queryKey: key,
  //     queryFn: () => Promise.resolve('hydrated'),
  //   })

  //   const persister = createMockPersister()

  //   await persistQueryClientSave({ queryClient, persister })

  //   queryClient.clear()

  //   const states: Array<string> = []

  //   function Page() {
  //     const { data, fetchStatus } = useQuery({
  //       queryKey: key,
  //       queryFn: async () => {
  //         states.push('fetching')
  //         await sleep(10)
  //         states.push('fetched')
  //         return 'fetched'
  //       },
  //     })

  //     // return (
  //     // <div>
  //     // <h1>{data}</h1>
  //     // <h2>fetchStatus: {fetchStatus}</h2>
  //     // </div>
  //     // )
  //   }

  //   const rendered = render
  //   // <PersistQueryClientProvider
  //   //   client={queryClient}
  //   //   persistOptions={{ persister }}
  //   //   onSuccess={async () => {
  //   //     states.push('onSuccess')
  //   //     await sleep(20)
  //   //     states.push('onSuccess done')
  //   //   }}
  //   // >
  //   //   <Page />
  //   // </PersistQueryClientProvider>,

  //   await waitFor(() => rendered.getByText('hydrated'))
  //   await waitFor(() => rendered.getByText('fetched'))
  //   expect(states).toEqual([
  //     'onSuccess',
  //     'onSuccess done',
  //     'fetching',
  //     'fetched',
  //   ])
  // })

  // test('should remove cache after non-successful restoring', async () => {
  //   const key = queryKey()
  //   const consoleMock = vi.spyOn(console, 'error')
  //   const consoleWarn = vi
  //     .spyOn(console, 'warn')
  //     .mockImplementation(() => undefined)
  //   consoleMock.mockImplementation(() => undefined)

  //   const queryClient = createQueryClient()
  //   const removeClient = vi.fn()

  //   const [error, persister] = createMockErrorPersister(removeClient)

  //   function Page() {
  //     const state = useQuery({
  //       queryKey: key,
  //       queryFn: async () => {
  //         await sleep(10)
  //         return 'fetched'
  //       },
  //     })

  //     // return (
  //     //   <div>
  //     //     <h1>{state.data}</h1>
  //     //     <h2>fetchStatus: {state.fetchStatus}</h2>
  //     //   </div>
  //     // )
  //   }

  //   const rendered = render
  //   // <PersistQueryClientProvider
  //   // client={queryClient}
  //   // persistOptions={{ persister }}
  //   // >
  //   // <Page />
  //   // </PersistQueryClientProvider>,

  //   await waitFor(() => rendered.getByText('fetched'))
  //   expect(removeClient).toHaveBeenCalledTimes(1)
  //   expect(consoleMock).toHaveBeenCalledTimes(1)
  //   expect(consoleMock).toHaveBeenNthCalledWith(1, error)
  //   consoleMock.mockRestore()
  //   consoleWarn.mockRestore()
  // })
})
