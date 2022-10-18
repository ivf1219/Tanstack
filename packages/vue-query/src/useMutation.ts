import { onScopeDispose, reactive, readonly, toRefs, watch, computed, unref, ref } from 'vue-demi'
import type { ToRefs } from 'vue-demi'
import { MutationObserver } from '@tanstack/query-core'
import type {
  MutateOptions,
  MutationFunction,
  MutationKey,
  MutationObserverOptions,
  MutateFunction,
  MutationObserverResult,
} from '@tanstack/query-core'
import { cloneDeepUnref, isQueryKey, updateState } from './utils'
import { useQueryClient } from './useQueryClient'
import type { MaybeRefArgs, WithQueryClientKey, MaybeRef } from './types'

type MutationResult<TData, TError, TVariables, TContext> = Omit<
  MutationObserverResult<TData, TError, TVariables, TContext>,
  'mutate' | 'reset'
>

export type UseMutationOptions<TData, TError, TVariables, TContext> =
  WithQueryClientKey<
    MutationObserverOptions<TData, TError, TVariables, TContext>
  >

type MutateSyncFunction<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
> = (
  ...options: Parameters<MaybeRefArgs<MutateFunction<TData, TError, TVariables, TContext>>>
) => void

export type UseMutationReturnType<
  TData,
  TError,
  TVariables,
  TContext,
  Result = MutationResult<TData, TError, TVariables, TContext>,
> = ToRefs<Readonly<Result>> & {
  mutate: MutateSyncFunction<TData, TError, TVariables, TContext>
  mutateAsync: MutateFunction<TData, TError, TVariables, TContext>
  reset: MutationObserverResult<TData, TError, TVariables, TContext>['reset']
}

export function useMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
): UseMutationReturnType<TData, TError, TVariables, TContext>
export function useMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: MaybeRef<MutationFunction<TData, TVariables>>,
  options?: MaybeRefArgs<Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    'mutationFn'
  >>,
): UseMutationReturnType<TData, TError, TVariables, TContext>
export function useMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationKey: MaybeRef<MutationKey>,
  options?: MaybeRefArgs<Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    'mutationKey'
  >>,
): UseMutationReturnType<TData, TError, TVariables, TContext>
export function useMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  mutationKey: MaybeRef<MutationKey>,
  mutationFn?: MaybeRef<MutationFunction<TData, TVariables>>,
  options?: MaybeRefArgs<Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    'mutationKey' | 'mutationFn'
  >>,
): UseMutationReturnType<TData, TError, TVariables, TContext>
export function useMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  arg1:
    | MaybeRef<MutationKey>
    | MaybeRef<MutationFunction<TData, TVariables>>
    | MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
  arg2?:
    | MaybeRef<MutationFunction<TData, TVariables>>
    | MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
  arg3?: MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
): UseMutationReturnType<TData, TError, TVariables, TContext> {
  
  const options = computed(() => {
    return parseMutationArgs(arg1, arg2, arg3)
  })

  const queryClient = options.value.queryClient ?? useQueryClient(options.value.queryClientKey)

  const observer = new MutationObserver(queryClient, queryClient.defaultMutationOptions(options.value))

  const state = reactive(observer.getCurrentResult())

  let unsubscribe = observer.subscribe((result) => {
    updateState(state, result)
  })

  const mutate = (
    variables: TVariables,
    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>,
  ) => {
    observer.mutate(variables, mutateOptions).catch(() => {
      // This is intentional
    })
  }

  watch(options,
    () => {
      observer.setOptions(
        queryClient.defaultMutationOptions(queryClient.defaultMutationOptions(options.value)),
      )
    },
    { deep: true },
  )

  onScopeDispose(() => {
    unsubscribe()
  })

  const resultRefs = toRefs(readonly(state)) as unknown as ToRefs<
    Readonly<MutationResult<TData, TError, TVariables, TContext>>
  >

  return {
    ...resultRefs,
    mutate,
    mutateAsync: state.mutate,
    reset: state.reset,
  }
}

export function parseMutationArgs<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  arg1:
    | MaybeRef<MutationKey>
    | MaybeRef<MutationFunction<TData, TVariables>>
    | MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
  arg2?:
    | MaybeRef<MutationFunction<TData, TVariables>>
    | MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
  arg3?: MaybeRefArgs<UseMutationOptions<TData, TError, TVariables, TContext>>,
): UseMutationOptions<TData, TError, TVariables, TContext> {
  let options = { ...arg1 }

  if (isQueryKey(unref(arg1))) {
    if ((typeof unref(arg2)) === 'function') {
      options = { ...arg3, mutationKey: arg1, mutationFn: arg2 }
    } else {
      options = { ...arg2, mutationKey: arg1 }
    }
  }

  if (typeof unref(arg1) === 'function') {
    options = { ...arg2, mutationFn: arg1 }
  }

  return cloneDeepUnref(options) as UseMutationOptions<
    TData,
    TError,
    TVariables,
    TContext
  >
}
