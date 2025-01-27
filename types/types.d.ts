// types.d.ts or similar file
import { NuxtApp } from '#app'

declare module '#app' {
  interface NuxtApp {
    $apiBaseUrl: () => string;
  }
}
