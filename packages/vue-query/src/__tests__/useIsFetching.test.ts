import { onScopeDispose, reactive } from 'vue-demi'

import { useQuery } from '../useQuery'
import { useIsFetching } from '../useIsFetching'
import { flushPromises, simpleFetcher } from './test-utils'

jest.mock('../useQueryClient')

describe('useIsFetching', () => {
  test('should properly return isFetching state', async () => {
    const { isFetching: isFetchingQuery } = useQuery(
      ['isFetching1'],
      simpleFetcher,
    )
    useQuery(['isFetching2'], simpleFetcher)
    const isFetching = useIsFetching()

    expect(isFetchingQuery.value).toStrictEqual(true)
    expect(isFetching.value).toStrictEqual(2)

    await flushPromises()

    expect(isFetchingQuery.value).toStrictEqual(false)
    expect(isFetching.value).toStrictEqual(0)
  })

  test('should stop listening to changes on onScopeDispose', async () => {
    const onScopeDisposeMock = onScopeDispose as jest.MockedFunction<
      typeof onScopeDispose
    >
    onScopeDisposeMock.mockImplementation((fn) => fn())

    const { status } = useQuery(['onScopeDispose'], simpleFetcher)
    const isFetching = useIsFetching()

    expect(status.value).toStrictEqual('loading')
    expect(isFetching.value).toStrictEqual(1)

    await flushPromises()

    expect(status.value).toStrictEqual('loading')
    expect(isFetching.value).toStrictEqual(1)

    await flushPromises()

    expect(status.value).toStrictEqual('loading')
    expect(isFetching.value).toStrictEqual(1)

    onScopeDisposeMock.mockReset()
  })

  test('should properly update filters', async () => {
    const filter = reactive({ stale: false })
    useQuery(
      ['isFetching'],
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            return resolve('Some data')
          }, 100)
        }),
    )
    const isFetching = useIsFetching(filter)

    expect(isFetching.value).toStrictEqual(0)

    filter.stale = true
    await flushPromises()

    expect(isFetching.value).toStrictEqual(1)

    await flushPromises(100)
  })
})
