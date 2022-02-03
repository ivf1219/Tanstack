// eslint-disable-next-line @typescript-eslint/no-var-requires
const createUtilsObject = require('./utils')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createKeyReplacer = require('./utils/replacers/key-replacer')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const hookCallTransformer = require('./utils/transformers/hook-call-transformer')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const queryClientTransformer = require('./utils/transformers/query-client-transformer')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const queryCacheTransformer = require('./utils/transformers/query-cache-transformer')

const transformQueryClientUsages = ({ jscodeshift, utils, root, filePath }) => {
  const transformer = queryClientTransformer({ jscodeshift, utils, root })
  const replacer = createKeyReplacer({ jscodeshift, root, filePath })

  transformer.execute(
    [
      // Not object syntax-aware methods.
      'getMutationDefaults',
      'getQueriesData',
      'getQueryData',
      'getQueryDefaults',
      'getQueryState',
      'isFetching',
      'setMutationDefaults',
      'setQueriesData',
      'setQueryData',
      'setQueryDefaults',
      // Object syntax-aware methods.
      'cancelQueries',
      'fetchInfiniteQuery',
      'fetchQuery',
      'invalidateQueries',
      'prefetchInfiniteQuery',
      'prefetchQuery',
      'refetchQueries',
      'removeQueries',
      'resetQueries',
    ],
    replacer
  )
}

const transformUseQueriesUsages = ({ jscodeshift, utils, root }) => {
  const transformer = hookCallTransformer({ jscodeshift, utils, root })
  const replacer = ({ node }) => {
    /**
     * When the node doesn't have the 'original' property, that means the codemod has been already applied,
     * so we don't need to do any changes.
     */
    if (!node.original) {
      return node
    }

    const newCallExpression = jscodeshift.callExpression(node.original.callee, [
      jscodeshift.objectExpression([
        jscodeshift.property(
          'init',
          jscodeshift.identifier('queries'),
          node.original.arguments[0]
        ),
      ]),
    ])

    // TODO: This should be part of one function!
    if (node.typeParameters) {
      newCallExpression.typeArguments = node.typeParameters
    }

    return newCallExpression
  }

  transformer.execute(['useQueries'], replacer)
}

const transformUseQueryLikeUsages = ({
  jscodeshift,
  utils,
  root,
  filePath,
}) => {
  const transformer = hookCallTransformer({ jscodeshift, utils, root })

  transformer.execute(
    ['useQuery', 'useInfiniteQuery', 'useIsFetching', 'useIsMutating'],
    createKeyReplacer({
      jscodeshift,
      root,
      filePath,
      keyName: 'queryKey',
    })
  )
  transformer.execute(
    ['useMutation'],
    createKeyReplacer({
      jscodeshift,
      root,
      filePath,
      keyName: 'mutationKey',
    })
  )
}

const transformQueryCacheUsages = ({ jscodeshift, utils, root, filePath }) => {
  const transformer = queryCacheTransformer({ jscodeshift, utils, root })
  const replacer = createKeyReplacer({ jscodeshift, root, filePath })

  transformer.execute(replacer)
}

module.exports = (file, api) => {
  const jscodeshift = api.jscodeshift
  const root = jscodeshift(file.source)

  const utils = createUtilsObject({ root, jscodeshift })
  const filePath = file.path

  // This function transforms usages like `useQuery` and `useMutation`.
  transformUseQueryLikeUsages({ jscodeshift, utils, root, filePath })
  // This function transforms usages of `useQueries`.
  transformUseQueriesUsages({ jscodeshift, utils, root })
  // This function transforms usages of `QueryClient`.
  transformQueryClientUsages({ jscodeshift, utils, root, filePath })
  // This function transforms usages of `QueryCache`.
  transformQueryCacheUsages({ jscodeshift, utils, root, filePath })

  return root.toSource({ quote: 'single' })
}
