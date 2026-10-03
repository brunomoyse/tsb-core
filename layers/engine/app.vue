<template>
  <!--
        The app shell, written out (audit PR 3.6, A15). It is the same tree Nuxt falls back to when a project has no
        app.vue, and the fallback already includes <NuxtRouteAnnouncer />; owning the file pins that, so a client-side
        navigation keeps announcing the new page title to screen readers whatever a Nuxt upgrade does to the default.
        Brand apps own error.vue and the layouts (which hold <ToastAnnouncer />, the persistent live region for cart and status messages).
    -->
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>
