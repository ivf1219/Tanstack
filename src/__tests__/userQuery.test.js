import { cleanup, render, act, waitForElement, fireEvent } from '@testing-library/react'
import * as React from 'react'

import { useQuery, queryCache, statusLoading, statusSuccess } from '../index'
import { sleep } from './utils'

describe('useQuery', () => {
  afterEach(() => {
    cleanup()
    queryCache.clear()
  })

  // See https://github.com/tannerlinsley/react-query/issues/105
  it('should allow to set default data value', async () => {
    function Page() {
      const { data = 'default' } = useQuery('test', async () => {
        await sleep(1000)
        return 'test'
      })

      return (
        <div>
          <h1 data-testid="title">{data}</h1>
        </div>
      )
    }

    const { getByTestId } = render(<Page />)

    await waitForElement(() => getByTestId('title'))
    expect(getByTestId('title').textContent).toBe('default')
  })

  // See https://github.com/tannerlinsley/react-query/issues/137
  it('should not override initial data in dependent queries', async () => {
    function Page() {
      const [shouldFetch, setShouldFetch] = React.useState(false);
      const { data: first } = useQuery(shouldFetch && 'first', () => 'first remote', {
        initialData: 'first',
      })

      const { data: second } = useQuery(shouldFetch && 'second', () => 'second remote', {
        initialData: 'second',
      })

      return (
        <div>
          <h2 data-testid="first">{first}</h2>
          <h2 data-testid="second">{second}</h2>
          <button onClick={() => setShouldFetch(true)}>fetch</button>
        </div>
      )
    }

    const { getByTestId, getByText } = render(<Page />)

    await waitForElement(() => [getByTestId('first'), getByTestId('second')])
    expect(getByTestId('first').textContent).toBe('first')
    expect(getByTestId('second').textContent).toBe('second')

    fireEvent.click(getByText('fetch'));

    await waitForElement(() => [getByTestId('first'), getByTestId('second')])
    expect(getByTestId('first').textContent).toBe('first remote')
    expect(getByTestId('second').textContent).toBe('second remote')
  })

  // See https://github.com/tannerlinsley/react-query/issues/144
  it('should be in "loading" state by default', async () => {
    function Page() {
      const { status } = useQuery('test', async () => {
        await sleep(1000)
        return 'test'
      })

      return (
        <div>
          <h1 data-testid="status">{status}</h1>
        </div>
      )
    }

    const { getByTestId } = render(<Page />)

    await waitForElement(() => getByTestId('status'))
    expect(getByTestId('status').textContent).toBe(statusLoading)
  })

  // See https://github.com/tannerlinsley/react-query/issues/144
  it('should be in "success" state by default in manual mode', async () => {
    function Page() {
      const { status } = useQuery(
        'test',
        async () => {
          await sleep(1000)
          return 'test'
        },
        {
          manual: true,
        }
      )

      return (
        <div>
          <h1 data-testid="status">{status}</h1>
        </div>
      )
    }

    const { getByTestId } = render(<Page />)

    await waitForElement(() => getByTestId('status'))
    expect(getByTestId('status').textContent).toBe(statusSuccess)
  })

  // See https://github.com/tannerlinsley/react-query/issues/147
  it('should not pass stringified variables to query function', async () => {
    const queryFn = jest.fn()
    const promise = Promise.resolve()
    queryFn.mockImplementation(() => promise)

    const variables = { number: 5, boolean: false, object: {}, array: [] }

    function Page() {
      useQuery(['test', variables], queryFn)

      return null
    }

    render(<Page />)

    // use "act" to wait for state update and prevent console warning
    await act(() => promise)

    expect(queryFn).toHaveBeenCalledWith('test', variables)
  })
})
