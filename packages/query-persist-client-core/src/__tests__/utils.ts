import type { QueryClientConfig } from '@tanstack/query-core'
import { QueryClient } from '@tanstack/query-core'

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
  return new QueryClient({ ...config })
}

export function sleep(timeout: number): Promise<void> {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, timeout)
  })
}
