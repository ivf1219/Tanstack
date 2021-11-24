import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { chunkArray, DefaultRenderer } from '../Explorer'

describe('Explorer', () => {
  describe('chunkArray', () => {
    it('when the size is less than one return an empty array', () => {
      expect(chunkArray([1, 2, 3], 0)).toStrictEqual([])
    })

    it('when the array is empty return an empty array', () => {
      expect(chunkArray([], 2)).toStrictEqual([])
    })

    it('when the array is evenly chunked return full chunks ', () => {
      expect(chunkArray([1, 2, 3, 4], 2)).toStrictEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('when the array is not evenly chunkable by size the last item is the remaining elements  ', () => {
      const chunks = chunkArray([1, 2, 3, 4, 5], 2)
      const lastChunk = chunks[chunks.length - 1]
      expect(lastChunk).toStrictEqual([5])
    })
  })

  describe('DefaultRenderer', () => {
    it('when the entry label is clicked, toggle expanded', async () => {
      const toggleExpanded = jest.fn()

      render(
        <DefaultRenderer
          label="the top level label"
          toggleExpanded={toggleExpanded}
          pageSize={10}
          handleEntry={() => <></>}
          expanded={false}
          subEntryPages={[[{ label: 'A lovely lable' }]]}
        />
      )

      const expandButton = screen.getByRole('button', {
        name: /▶ the top level label 0 item/i,
      })

      fireEvent.click(expandButton)

      expect(toggleExpanded).toHaveBeenCalledTimes(1)
    })
  })
})
