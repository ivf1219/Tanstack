import { sleep } from '../../react/tests/utils'
import { makeQueryCache } from '../..'
import { dehydrate, hydrate } from '../hydration'

const fetchData: <TResult>(
  value: TResult,
  ms?: number
) => Promise<TResult> = async (value, ms) => {
  await sleep(ms || 0)
  return value
}

describe('dehydration and rehydration', () => {
  test('should work with serializeable values', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    await queryCache.prefetchQuery('number', () => fetchData(1))
    await queryCache.prefetchQuery('boolean', () => fetchData(true))
    await queryCache.prefetchQuery('null', () => fetchData(null))
    await queryCache.prefetchQuery('array', () => fetchData(['string', 0]))
    await queryCache.prefetchQuery('nested', () =>
      fetchData({ key: [{ nestedKey: 1 }] })
    )
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(hydrationQueryCache.getQuery('string')?.state.data).toBe('string')
    expect(hydrationQueryCache.getQuery('number')?.state.data).toBe(1)
    expect(hydrationQueryCache.getQuery('boolean')?.state.data).toBe(true)
    expect(hydrationQueryCache.getQuery('null')?.state.data).toBe(null)
    expect(hydrationQueryCache.getQuery('array')?.state.data).toEqual([
      'string',
      0,
    ])
    expect(hydrationQueryCache.getQuery('nested')?.state.data).toEqual({
      key: [{ nestedKey: 1 }],
    })

    const fetchDataAfterHydration = jest.fn()
    await hydrationQueryCache.prefetchQuery('string', fetchDataAfterHydration)
    await hydrationQueryCache.prefetchQuery('number', fetchDataAfterHydration)
    await hydrationQueryCache.prefetchQuery('boolean', fetchDataAfterHydration)
    await hydrationQueryCache.prefetchQuery('null', fetchDataAfterHydration)
    await hydrationQueryCache.prefetchQuery('array', fetchDataAfterHydration)
    await hydrationQueryCache.prefetchQuery('nested', fetchDataAfterHydration)
    expect(fetchDataAfterHydration).toHaveBeenCalledTimes(0)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should default to scheduling staleness immediately', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(hydrationQueryCache.getQuery('string')?.state.data).toBe('string')
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(false)
    await sleep(10)
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(true)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should respect staleTime, measured from when data was fetched', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'), {
      staleTime: 50,
    })
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    await sleep(20)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(hydrationQueryCache.getQuery('string')?.state.data).toBe('string')
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(false)
    await sleep(10)
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(false)
    await sleep(30)
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(true)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should schedule stale immediately if enough time has elapsed between dehydrate and hydrate', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'), {
      staleTime: 20,
    })
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    await sleep(30)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(hydrationQueryCache.getQuery('string')?.state.data).toBe('string')
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(false)
    await sleep(10)
    expect(hydrationQueryCache.getQuery('string')?.state.isStale).toBe(true)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should schedule garbage collection, measured from hydration', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'), {
      cacheTime: 50,
    })
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    await sleep(20)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(hydrationQueryCache.getQuery('string')?.state.data).toBe('string')
    await sleep(40)
    expect(hydrationQueryCache.getQuery('string')).toBeTruthy()
    await sleep(20)
    expect(hydrationQueryCache.getQuery('string')).toBeFalsy()

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should work with complex keys', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery(
      ['string', { key: ['string'], key2: 0 }],
      () => fetchData('string')
    )
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(
      hydrationQueryCache.getQuery(['string', { key: ['string'], key2: 0 }])
        ?.state.data
    ).toBe('string')

    const fetchDataAfterHydration = jest.fn()
    await hydrationQueryCache.prefetchQuery(
      ['string', { key: ['string'], key2: 0 }],
      fetchDataAfterHydration
    )
    expect(fetchDataAfterHydration).toHaveBeenCalledTimes(0)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should not include default config in dehydration', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    const dehydrated = dehydrate(queryCache)

    // This is testing implementation details that can change and are not
    // part of the public API, but is important for keeping the payload small
    // Exact shape is not important here, just that staleTime and cacheTime
    // (and any future other config) is not included in it
    expect(dehydrated['["string"]'].config.staleTime).toBe(undefined)
    expect(dehydrated['["string"]'].config.cacheTime).toBe(undefined)
  })

  test('should only hydrate successful queries', async () => {
    const consoleMock = jest.spyOn(console, 'error')
    consoleMock.mockImplementation(() => undefined)

    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('success', () => fetchData('success'))
    queryCache.prefetchQuery('loading', () => fetchData('loading', 10000))
    await queryCache.prefetchQuery('error', () => {
      throw new Error()
    })
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)

    expect(hydrationQueryCache.getQuery('success')).toBeTruthy()
    expect(hydrationQueryCache.getQuery('loading')).toBeFalsy()
    expect(hydrationQueryCache.getQuery('error')).toBeFalsy()

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
    consoleMock.mockRestore()
  })

  test('should filter queries via shouldDehydrate', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    await queryCache.prefetchQuery('number', () => fetchData(1))
    const dehydrated = dehydrate(queryCache, {
      shouldDehydrate: query => query.queryKey[0] !== 'string',
    })

    expect(dehydrated['["string"]']).toBeUndefined()

    const stringified = JSON.stringify(dehydrated)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed)
    expect(hydrationQueryCache.getQuery('string')).toBeUndefined()
    expect(hydrationQueryCache.getQuery('number')?.state.data).toBe(1)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })

  test('should filter queries via shouldHydrate', async () => {
    const queryCache = makeQueryCache()
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    await queryCache.prefetchQuery('number', () => fetchData(1))
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // ---

    const parsed = JSON.parse(stringified)
    const hydrationQueryCache = makeQueryCache()
    hydrate(hydrationQueryCache, parsed, {
      shouldHydrate: ({ queryKey }) =>
        Array.isArray(queryKey) && queryKey[0] !== 'string',
    })
    expect(hydrationQueryCache.getQuery('string')).toBeUndefined()
    expect(hydrationQueryCache.getQuery('number')?.state.data).toBe(1)

    queryCache.clear({ notify: false })
    hydrationQueryCache.clear({ notify: false })
  })
})
