// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  // 1) your GraphQL endpoint (or local .graphql schema files)
  schema: 'http://localhost:8080/api/v1/graphql',
  // 2) point at your .graphql operation files
  documents: ['graphql/**/*.graphql'],

  generates: {
    // 3) emit a typed "client" SDK into src/gql/
    'gql/': {
      preset: 'client',
      // no individual plugins needed—the client preset pulls in:
      //   - typescript
      //   - typescript-operations
      //   - typed-document-node
      plugins: [],
      presetConfig: {
        // disable fragment masking if you’re not using fragments
        fragmentMasking: false,
      },
    },

    // 4) also output an introspection JSON if you need it
    './graphql.schema.json': {
      plugins: ['introspection'],
    },
  },
}

export default config
