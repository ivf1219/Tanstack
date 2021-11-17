import { waitFor } from '@testing-library/react'
import { queryKey, mockConsoleError, sleep } from '../../react/tests/utils'
import { MutationCache, MutationObserver, QueryClient } from '../..'

describe('mutationCache', () => {
  describe('MutationCacheConfig.onError', () => {
    test('should be called when a mutation errors', async () => {
      const consoleMock = mockConsoleError()
      const key = queryKey()
      const onError = jest.fn()
      const testCache = new MutationCache({ onError })
      const testClient = new QueryClient({ mutationCache: testCache })

      try {
        await testClient.executeMutation({
          mutationKey: key,
          variables: 'vars',
          mutationFn: () => Promise.reject('error'),
          onMutate: () => 'context',
        })
      } catch {
        consoleMock.mockRestore()
      }

      const mutation = testCache.getAll()[0]
      expect(onError).toHaveBeenCalledWith('error', 'vars', 'context', mutation)
    })
  })
  describe('MutationCacheConfig.onSuccess', () => {
    test('should be called when a mutation is successful', async () => {
      const consoleMock = mockConsoleError()
      const key = queryKey()
      const onSuccess = jest.fn()
      const testCache = new MutationCache({ onSuccess })
      const testClient = new QueryClient({ mutationCache: testCache })

      try {
        await testClient.executeMutation({
          mutationKey: key,
          variables: 'vars',
          mutationFn: () => Promise.resolve({ data: 5 }),
          onMutate: () => 'context',
        })
      } catch {
        consoleMock.mockRestore()
      }

      const mutation = testCache.getAll()[0]
      expect(onSuccess).toHaveBeenCalledWith(
        { data: 5 },
        'vars',
        'context',
        mutation
      )
    })
  })

  describe('find', () => {
    test('should filter correctly', async () => {
      const testCache = new MutationCache()
      const testClient = new QueryClient({ mutationCache: testCache })
      const key = ['mutation', 'vars']
      await testClient.executeMutation({
        mutationKey: key,
        variables: 'vars',
        mutationFn: () => Promise.resolve(),
      })
      const [mutation] = testCache.getAll()
      expect(testCache.find({ mutationKey: key })).toEqual(mutation)
      expect(testCache.find({ mutationKey: 'mutation', exact: false })).toEqual(
        mutation
      )
      expect(testCache.find({ mutationKey: 'unknown' })).toEqual(undefined)
      expect(
        testCache.find({ predicate: m => m.options.variables === 'vars' })
      ).toEqual(mutation)
    })
  })

  describe('findAll', () => {
    test('should filter correctly', async () => {
      const testCache = new MutationCache()
      const testClient = new QueryClient({ mutationCache: testCache })
      await testClient.executeMutation({
        mutationKey: ['a', 1],
        variables: 1,
        mutationFn: () => Promise.resolve(),
      })
      await testClient.executeMutation({
        mutationKey: ['a', 2],
        variables: 2,
        mutationFn: () => Promise.resolve(),
      })
      await testClient.executeMutation({
        mutationKey: 'b',
        mutationFn: () => Promise.resolve(),
      })

      const [mutation1, mutation2] = testCache.getAll()
      expect(
        testCache.findAll({ mutationKey: 'a', exact: false })
      ).toHaveLength(2)
      expect(testCache.find({ mutationKey: ['a', 1] })).toEqual(mutation1)
      expect(testCache.findAll({ mutationKey: 'unknown' })).toEqual([])
      expect(
        testCache.findAll({ predicate: m => m.options.variables === 2 })
      ).toEqual([mutation2])
    })
  })

  describe('garbage collection', () => {
    test('should remove unused mutations after cacheTime has elapsed', async () => {
      const testCache = new MutationCache()
      const testClient = new QueryClient({ mutationCache: testCache })
      const onSuccess = jest.fn()
      await testClient.executeMutation({
        mutationKey: ['a', 1],
        variables: 1,
        cacheTime: 10,
        mutationFn: () => Promise.resolve(),
        onSuccess,
      })

      expect(testCache.getAll()).toHaveLength(1)
      await sleep(10)
      await waitFor(() => {
        expect(testCache.getAll()).toHaveLength(0)
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    test('should not remove mutations if there are active observers', async () => {
      const queryClient = new QueryClient()
      const observer = new MutationObserver(queryClient, {
        variables: 1,
        cacheTime: 10,
        mutationFn: () => Promise.resolve(),
      })
      const unsubscribe = observer.subscribe()

      expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
      observer.mutate(1)
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
      await sleep(10)
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
      unsubscribe()
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
      await sleep(10)
      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
      })
    })

    test('should only remove when the last observer unsubscribes', async () => {
      const queryClient = new QueryClient()
      const observer1 = new MutationObserver(queryClient, {
        variables: 1,
        cacheTime: 10,
        mutationFn: async () => {
          await sleep(10)
          return 'update1'
        },
      })

      const observer2 = new MutationObserver(queryClient, {
        cacheTime: 10,
        mutationFn: async () => {
          await sleep(10)
          return 'update2'
        },
      })

      await observer1.mutate()

      // we currently have no way to add multiple observers to the same mutation
      const currentMutation = observer1['currentMutation']!
      currentMutation?.addObserver(observer1)
      currentMutation?.addObserver(observer2)

      expect(currentMutation['observers'].length).toEqual(2)
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)

      currentMutation?.removeObserver(observer1)
      currentMutation?.removeObserver(observer2)
      expect(currentMutation['observers'].length).toEqual(0)
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
      // wait for cacheTime to gc
      await sleep(10)
      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
      })
    })

    test('should be garbage collected later when unsubscribed and mutation is loading', async () => {
      const queryClient = new QueryClient()
      const onSuccess = jest.fn()
      const observer = new MutationObserver(queryClient, {
        variables: 1,
        cacheTime: 10,
        mutationFn: async () => {
          await sleep(20)
          return 'data'
        },
        onSuccess,
      })
      const unsubscribe = observer.subscribe()
      observer.mutate(1)
      unsubscribe()
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
      await sleep(10)
      // unsubscribe should not remove even though cacheTime has elapsed b/c mutation is still loading
      expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
      await sleep(10)
      // should be removed after an additional cacheTime wait
      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    test('should call callbacks even with cacheTime 0 and mutation still loading', async () => {
      const queryClient = new QueryClient()
      const onSuccess = jest.fn()
      const observer = new MutationObserver(queryClient, {
        variables: 1,
        cacheTime: 0,
        mutationFn: async () => {
          return 'data'
        },
        onSuccess,
      })
      const unsubscribe = observer.subscribe()
      observer.mutate(1)
      unsubscribe()
      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})
