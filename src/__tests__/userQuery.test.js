import {
  cleanup,
  render,
  fireEvent,
  waitForElement,
} from '@testing-library/react'
import * as React from 'react'

import { useQuery, queryCache } from '../index'
import { sleep } from './utils'

describe('useQuery', () => {
  afterEach(() => {
    cleanup();
    queryCache.clear();
  })

  // See https://github.com/tannerlinsley/react-query/issues/105
  it('should allow to set default data value', async () => {
    function Page() {
      const { data = 'default' } = useQuery('test', async () => {
        await sleep(1000);
        return 'test';
      });

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
})
