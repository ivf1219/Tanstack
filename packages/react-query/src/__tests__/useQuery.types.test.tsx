import { useQuery } from '../useQuery'
import { queryOptions } from '../queryOptions'
import { doNotExecute } from './utils'
import type { UseQueryOptions } from '../types'
import type { Equal, Expect } from './utils'

describe('initialData', () => {
  describe('Config object overload', () => {
    it('TData should always be defined when initialData is provided as an object', () => {
      doNotExecute(() => {
        const { data } = useQuery({
          queryKey: ['key'],
          queryFn: () => {
            return {
              wow: true,
            }
          },
          initialData: {
            wow: true,
          },
        })

        const result: Expect<Equal<{ wow: boolean }, typeof data>> = true
        return result
      })
    })

    it('TData should be defined when passed through queryOptions', () => {
      doNotExecute(() => {
        const options = queryOptions({
          queryKey: ['key'],
          queryFn: () => {
            return {
              wow: true,
            }
          },
          initialData: {
            wow: true,
          },
        })
        const { data } = useQuery(options)

        const result: Expect<Equal<{ wow: boolean }, typeof data>> = true
        return result
      })
    })

    it('it should be possible to define a different TData than TQueryFnData using select with queryOptions spread into useQuery', () => {
      doNotExecute(() => {
        const options = queryOptions({
          queryKey: ['key'],
          queryFn: () => Promise.resolve(1),
        })
        useQuery({
          ...options,
          select: (data) => data > 1,
        })
      })
    })

    it('TData should always be defined when initialData is provided as a function which ALWAYS returns the data', () => {
      doNotExecute(() => {
        const { data } = useQuery({
          queryKey: ['key'],
          queryFn: () => {
            return {
              wow: true,
            }
          },
          initialData: () => ({
            wow: true,
          }),
        })

        const result: Expect<Equal<{ wow: boolean }, typeof data>> = true
        return result
      })
    })

    it('TData should have undefined in the union when initialData is NOT provided', () => {
      doNotExecute(() => {
        const { data } = useQuery({
          queryKey: ['key'],
          queryFn: () => {
            return {
              wow: true,
            }
          },
        })

        const result: Expect<Equal<{ wow: boolean } | undefined, typeof data>> =
          true
        return result
      })
    })

    it('TData should have undefined in the union when initialData is provided as a function which can return undefined', () => {
      doNotExecute(() => {
        const { data } = useQuery({
          queryKey: ['key'],
          queryFn: () => {
            return {
              wow: true,
            }
          },
          initialData: () => undefined as { wow: boolean } | undefined,
        })

        const result: Expect<Equal<{ wow: boolean } | undefined, typeof data>> =
          true
        return result
      })
    })

    it('TData should be narrowed after an isSuccess check when initialData is provided as a function which can return undefined', () => {
      doNotExecute(() => {
        const { data, isSuccess } = useQuery({
          queryKey: ['key'],
          queryFn: () => {
            return {
              wow: true,
            }
          },
          initialData: () => undefined as { wow: boolean } | undefined,
        })

        if (isSuccess) {
          const result: Expect<Equal<{ wow: boolean }, typeof data>> = true
          return result
        }
        return false
      })
    })
  })

  describe('custom hook', () => {
    it('should allow custom hooks using UseQueryOptions', () => {
      doNotExecute(() => {
        type Data = string

        const useCustomQuery = (
          options?: Omit<UseQueryOptions<Data>, 'queryKey' | 'queryFn'>,
        ) => {
          return useQuery({
            ...options,
            queryKey: ['todos-key'],
            queryFn: () => Promise.resolve('data'),
          })
        }

        const { data } = useCustomQuery()

        const result: Expect<Equal<Data | undefined, typeof data>> = true
        return result
      })
    })
  })
})

describe('placeholderData', () => {
  it('should receive contextual parameter type', () => {
    doNotExecute(() => {
      const options = {
        queryKey: ['foo'] as const,
        queryFn: () => Promise.resolve(5),
        staleTime: 10 * 1000,
      }

      return useQuery({
        ...options,
        placeholderData: (previousData) => {
          const result: Expect<Equal<number | undefined, typeof previousData>> =
            true
          return result && previousData
        },
      })
    })
  })
})
