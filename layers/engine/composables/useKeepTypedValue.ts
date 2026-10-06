import type { Ref } from 'vue'

/*
 * Keeps what a visitor typed (or the browser autofilled) into a server-rendered field before the app hydrated.
 *
 * Vue's v-model puts its model value back into the field when it hydrates, and keeps what was typed only for `type="text"` and
 * textareas: an `email` or `tel` field is emptied. The window between the first paint and hydration is a second or two on
 * a slow phone, long enough to type an address or for the browser to autofill it. Call this in `setup`, with the field's id,
 * before the template renders: during the first hydration it copies the field's value into the model when the model is empty,
 * so that the render then writes the same value back. Any later setup (a client-side navigation, a modal opened after the
 * page loaded) has no server-rendered field and does nothing.
 */
export function useKeepTypedValue(model: Ref<string>, id: string): void {
  if (!import.meta.client || useNuxtApp().isHydrating !== true) return
  const field = document.getElementById(id)
  const typed = field instanceof HTMLInputElement ? field.value : undefined
  if (typed !== undefined && typed !== '' && model.value === '') model.value = typed
}
