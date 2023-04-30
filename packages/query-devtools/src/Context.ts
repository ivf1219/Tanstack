import type { QueryClient, onlineManager, Query } from '@tanstack/query-core'
import { createContext, useContext } from 'solid-js'

type XPosition = 'left' | 'right'
type YPosition = 'top' | 'bottom'
export type DevtoolsPosition = XPosition | YPosition
export type DevtoolsButtonPosition = `${YPosition}-${XPosition}`

export interface DevToolsErrorType {
  /**
   * The name of the error.
   */
  name: string
  /**
   * How the error is initialized.
   */
  initializer: (query: Query) => Error
}

export interface QueryDevtoolsProps {
  readonly client: QueryClient
  queryFlavor: string
  version: string
  onlineManager: typeof onlineManager

  buttonPosition?: DevtoolsButtonPosition
  position?: DevtoolsPosition
  initialIsOpen?: boolean
  errorTypes?: DevToolsErrorType[]
}

export const QueryDevtoolsContext = createContext<QueryDevtoolsProps>({
  client: undefined as unknown as QueryClient,
  onlineManager: undefined as unknown as typeof onlineManager,
  queryFlavor: '',
  version: '',
})

export function useQueryDevtoolsContext() {
  return useContext(QueryDevtoolsContext)
}
