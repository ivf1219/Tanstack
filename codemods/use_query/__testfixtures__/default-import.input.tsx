import * as React from 'react'
import { useQuery } from 'react-query'

export const Example = () => {
  const { data } = useQuery('repoData', () =>
    fetch('https://api.github.com/repos/tannerlinsley/react-query').then(res =>
      res.json()
    )
  )

  return <div>{JSON.stringify(data)}</div>
}
