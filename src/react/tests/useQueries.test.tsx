import React from 'react'

import { queryKey, renderWithClient, sleep } from './utils'
import {
  useQueries,
  QueryClient,
  UseQueryResult,
  QueryCache,
  QueryObserverResult,
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

  it('should flow through data types correctly (a type test; validated by successful compilation; not runtime results)', async () => {
    const results: QueryObserverResult<number, Error>[] = useQueries<number, Error>(
      [1, 2, 3].map(num => ({ queryKey: queryKey(), queryFn: () => num }))
    )

    expect(results.length).toBe(2)
  })
})
