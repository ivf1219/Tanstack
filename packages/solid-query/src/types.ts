import type {
  DefinedQueryObserverResult,
  MutateFunction,
  MutationObserverOptions,
  MutationObserverResult,
  QueryClient,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/query-core'
import type { Context } from 'solid-js'

export interface ContextOptions {
  /**
   * Use this to pass your React Query context. Otherwise, `defaultContext` will be used.
   */
  context?: Context<QueryClient | undefined>
}

export type SolidQueryKey = () => readonly unknown[]

export interface CreateBaseQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  // TODO(lukemurray): maybe this should be a solid query key?
  TQueryKey extends QueryKey = QueryKey,
> extends ContextOptions,
    QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {}

export interface CreateQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends () => readonly unknown[] = SolidQueryKey,
> extends CreateBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryFnData,
    ReturnType<TQueryKey>
  > {}

// export interface UseInfiniteQueryOptions<
//   TQueryFnData = unknown,
//   TError = unknown,
//   TData = TQueryFnData,
//   TQueryData = TQueryFnData,
//   TQueryKey extends QueryKey = QueryKey,
// > extends ContextOptions,
//     InfiniteQueryObserverOptions<
//       TQueryFnData,
//       TError,
//       TData,
//       TQueryData,
//       TQueryKey
//     > {}

export type CreateBaseQueryResult<
  TData = unknown,
  TError = unknown,
> = QueryObserverResult<TData, TError>

export type CreateQueryResult<
  TData = unknown,
  TError = unknown,
> = CreateBaseQueryResult<TData, TError>

export type DefinedCreateBaseQueryResult<
  TData = unknown,
  TError = unknown,
> = DefinedQueryObserverResult<TData, TError>

export type DefinedCreateQueryResult<
  TData = unknown,
  TError = unknown,
> = DefinedCreateBaseQueryResult<TData, TError>

// export type UseInfiniteQueryResult<
//   TData = unknown,
//   TError = unknown,
// > = InfiniteQueryObserverResult<TData, TError>

export interface CreateMutationOptions<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
> extends ContextOptions,
    Omit<
      MutationObserverOptions<TData, TError, TVariables, TContext>,
      '_defaulted' | 'variables'
    > {}

export type CreateMutateFunction<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
> = (
  ...args: Parameters<MutateFunction<TData, TError, TVariables, TContext>>
) => void

export type CreateMutateAsyncFunction<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
> = MutateFunction<TData, TError, TVariables, TContext>

export type CreateBaseMutationResult<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown,
> = Override<
  MutationObserverResult<TData, TError, TVariables, TContext>,
  { mutate: CreateMutateFunction<TData, TError, TVariables, TContext> }
> & {
  mutateAsync: CreateMutateAsyncFunction<TData, TError, TVariables, TContext>
}

export type CreateMutationResult<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown,
> = CreateBaseMutationResult<TData, TError, TVariables, TContext>

type Override<A, B> = { [K in keyof A]: K extends keyof B ? B[K] : A[K] }
