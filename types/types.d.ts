// types.d.ts or similar file
// eslint-disable-next-line
import { NuxtApp } from '#app'

declare module '#app' {
  interface NuxtApp {
    $apiBaseUrl: () => string;
  }
}
