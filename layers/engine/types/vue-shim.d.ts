// `vp check` type-checks without vue-tsc, which does not know `.vue` modules: a `.vue` file imported by a test is a
// component for it (nuxi typecheck resolves the real file, this declaration is then not used).
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
