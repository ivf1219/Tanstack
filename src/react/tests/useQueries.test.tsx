import React from 'react'

import { queryKey, renderWithClient, sleep } from './utils'
import {
  useQueries,
  QueryClient,
  UseQueryResult,
  QueryCache,
} from '../..'

describe('useQueries', () => {
  const queryCache = new QueryCache()
  const queryClient = new QueryClient({ queryCache })

  it('should return the correct states', async () => {
    const key1 = queryKey()
    const key2 = queryKey()
    const results: UseQueryResult[][] = []

    function Page() {
      const result = useQueries([
        { queryKey: key1, queryFn: () => 1 },
        { queryKey: key2, queryFn: () => 2 },
      ])
      results.push(result)
      return null
    }

    renderWithClient(queryClient, <Page />)

    await sleep(10)

    expect(results.length).toBe(3)
    expect(results[0]).toMatchObject([{ data: undefined }, { data: undefined }])
    expect(results[1]).toMatchObject([{ data: 1 }, { data: undefined }])
    expect(results[2]).toMatchObject([{ data: 1 }, { data: 2 }])
  })

  it('should return same data types correctly (a type test; validated by successful compilation; not runtime results)', async () => {
    const key1 = queryKey()
    const key2 = queryKey()
    const results: number[] = [];

    function Page() {
      const result = useQueries([
        { queryKey: key1, queryFn: () => 1 },
        { queryKey: key2, queryFn: () => 2 },
      ])
      if (result[0].data) {
        results.push(result[0].data)
      }
      if (result[1].data) {
        results.push(result[1].data)
      }
      return null
    }

    renderWithClient(queryClient, <Page />)

    await sleep(10)
  })

  it('should return different data types correctly (a type test; validated by successful compilation; not runtime results)', async () => {
    const key1 = queryKey()
    const key2 = queryKey()
    const results: (number | string)[] = [];

    function Page() {
      const result = useQueries<number | string>([
        { queryKey: key1, queryFn: () => 1 },
        { queryKey: key2, queryFn: () => 'two' },
      ])
      if (result[0].data) {
        results.push(result[0].data)
      }
      if (result[1].data) {
        results.push(result[1].data)
      }
      return null
    }

    renderWithClient(queryClient, <Page />)

    await sleep(10)
  })
})
