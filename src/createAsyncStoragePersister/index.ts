import {
  defaultErrorHandler,
  PersistedClient,
  Persister,
} from '../persistQueryClient'
import { asyncThrottle } from './asyncThrottle'
import { noop } from '../core/utils'

interface AsyncStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

export type AsyncPersistErrorHandler = (props: {
  persistedClient: PersistedClient
  error: Error
  errorCount: number
}) => Promise<PersistedClient>

interface CreateAsyncStoragePersisterOptions {
  /** The storage client used for setting an retrieving items from cache */
  storage: AsyncStorage | undefined
  /** The key to use when storing the cache */
  key?: string
  /** To avoid spamming,
   * pass a time in ms to throttle saving the cache to disk */
  throttleTime?: number
  /**
   * How to serialize the data to storage.
   * @default `JSON.stringify`
   */
  serialize?: (client: PersistedClient) => string
  /**
   * How to deserialize the data from storage.
   * @default `JSON.parse`
   */
  deserialize?: (cachedString: string) => PersistedClient

  handlePersistError?: AsyncPersistErrorHandler
}

export const createAsyncStoragePersister = ({
  storage,
  key = `REACT_QUERY_OFFLINE_CACHE`,
  throttleTime = 1000,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  handlePersistError = async props => defaultErrorHandler(props),
}: CreateAsyncStoragePersisterOptions): Persister => {
  if (typeof storage !== 'undefined') {
    const trySave = async (
      persistedClient: PersistedClient
    ): Promise<Error | undefined> => {
      try {
        await storage.setItem(key, serialize(persistedClient))
      } catch (error) {
        return error as Error
      }
    }

    const removeClient = () => storage.removeItem(key)

    return {
      persistClient: asyncThrottle(
        async persistedClient => {
          let client = persistedClient
          let error = await trySave(client)
          let errorCount = 0
          try {
            while (error) {
              errorCount++
              client = await handlePersistError({
                persistedClient: client,
                error,
                errorCount,
              })

              error = await trySave(client)
            }
          } catch {
            await removeClient()
          }
        },
        { interval: throttleTime }
      ),
      restoreClient: async () => {
        const cacheString = await storage.getItem(key)

        if (!cacheString) {
          return
        }

        return deserialize(cacheString) as PersistedClient
      },
      removeClient,
    }
  }

  return {
    persistClient: noop,
    restoreClient: noop,
    removeClient: noop,
  }
}
