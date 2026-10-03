<template>
  <div class="flex justify-center px-4 pt-6 sm:pt-10 pb-12">
    <div class="w-full max-w-md">
      <div class="card relative">
        <div class="absolute top-2 right-2 z-10">
          <LanguagePicker />
        </div>

        <div class="px-7 sm:px-10 pt-14 pb-8 sm:pb-10">
          <PageTitle class="text-center mb-4">
            {{ $t('login.title') }}
          </PageTitle>

          <!-- Session expired notice -->
          <p
            v-if="sessionExpired"
            aria-atomic="true"
            aria-live="assertive"
            class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 mb-4 animate-shake"
            role="alert"
          >
            {{ $t('notify.errors.sessionExpired') }}
          </p>

          <AuthFlow mode="page" :auth-request-id="authRequestId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, navigateTo, useLocalePath, useRoute, useSeoMeta } from '#imports'
import AuthFlow from '#engine/components/auth/AuthFlow.vue'
import LanguagePicker from '~/components/navbar/LanguagePicker.vue'
import { useI18n } from 'vue-i18n'

definePageMeta({ public: true })

const { t } = useI18n()
const route = useRoute()

const sessionExpired = ref(false)
const authRequestId = computed(
  () => (route.query.authRequestID as string) || (route.query.authRequest as string) || '',
)

useSeoMeta({
  title: t('schema.login.title'),
  description: t('schema.login.description'),
  robots: 'noindex,nofollow',
})

onMounted(async () => {
  if (!import.meta.client) return

  /*
   * Persist the session-expired notice across the Zitadel round-trip below.
   * Without this, the redirect would wipe the `?session=expired` query param
   * and the user would land on the form with no context.
   */
  if (route.query.session === 'expired') {
    sessionStorage.setItem('auth_session_expired', '1')
  }
  if (sessionStorage.getItem('auth_session_expired') === '1') {
    sessionExpired.value = true
    if (authRequestId.value) sessionStorage.removeItem('auth_session_expired')
  }

  // Have an authRequestId — AuthFlow can drive the OTP / SSO flows.
  if (authRequestId.value) return

  const { useOidc } = await import('#engine/composables/useOidc')
  const { isAuthenticated } = useOidc()

  // Already authenticated and no auth flow in progress — they don't belong here.
  if (await isAuthenticated()) {
    const localePath = useLocalePath()
    await navigateTo(localePath('menu'))
    return
  }

  /*
   * Bounce through Zitadel so we come back with an authRequestID. This
   * is the ONLY way AuthFlow obtains one — its finalize step must not mint
   * a fresh signIn() mid-flow, which orphans the auth_request and strands
   * the user mid-OTP.
   */
  const { signIn } = useOidc()
  const uiLocale = route.path.split('/')[1] || 'fr'
  await signIn({ ui_locales: uiLocale })
})
</script>
