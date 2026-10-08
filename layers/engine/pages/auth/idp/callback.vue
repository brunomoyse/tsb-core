<template>
  <div class="flex justify-center items-center min-h-[50dvh]">
    <div class="w-full max-w-sm px-4 text-center">
      <div v-if="rateLimited" class="text-amber-700">
        <p class="text-lg font-medium">{{ $t('notify.errors.tooManyRequests') }}</p>
        <NuxtLinkLocale to="/auth/login" class="text-primary-700 underline mt-2 inline-block">
          {{ $t('login.tryAgain') }}
        </NuxtLinkLocale>
      </div>
      <div v-else-if="cancelled" data-testid="idp-cancelled">
        <p class="text-lg font-medium text-neutral-800">{{ $t('login.idpCancelled') }}</p>
        <NuxtLinkLocale to="/auth/login" class="text-primary-700 underline mt-2 inline-block">
          {{ $t('login.tryAgain') }}
        </NuxtLinkLocale>
      </div>
      <div v-else-if="error" class="text-red-700">
        <p class="text-lg font-medium">{{ $t('login.callbackError') }}</p>
        <NuxtLinkLocale to="/auth/login" class="text-primary-700 underline mt-2 inline-block">
          {{ $t('login.tryAgain') }}
        </NuxtLinkLocale>
      </div>
      <ProfileNameForm
        v-else-if="needsProfile"
        class="text-left"
        :loading="profileLoading"
        :error-message="profileError"
        @submit="onSubmitProfile"
      />
      <div v-else class="animate-pulse">
        <p class="text-neutral-600">{{ $t('login.authenticating') }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { definePageMeta, onMounted, ref, useRoute, useSeoMeta } from '#imports'
import ProfileNameForm from '#engine/components/auth/ProfileNameForm.vue'
import { isIdpSignInCancelled } from '#engine/utils/authErrors'
import { reportError } from '#engine/utils/reportError'
import { useI18n } from 'vue-i18n'

definePageMeta({ public: true })
// Sign-in plumbing, not content: never indexed (audit PR 6.4, P15; the login pages say the same).
useSeoMeta({ robots: 'noindex,nofollow' })

const route = useRoute()
const { t } = useI18n()
const error = ref(false)
const rateLimited = ref(false)
// The customer stopped on the Google or Apple screen: not an error, just the way back.
const cancelled = ref(false)
const needsProfile = ref(false)
const profileLoading = ref(false)
const profileError = ref('')

// IdP session carried from createIdpSession to the profile-completion submit.
let idpSessionId = ''
let idpSessionToken = ''
let pendingAuthRequestId = ''

const redirectToCallback = (callbackUrl: string) => {
  /* The OIDC callback route is where oidc-client-ts exchanges the code. */
  sessionStorage.removeItem('oidcAuthRequestId')
  window.location.href = callbackUrl
}

onMounted(async () => {
  // Check for IdP failure
  if (route.query.error) {
    error.value = true
    return
  }

  // Zitadel appends id and token to the success URL
  const idpIntentId = route.query.id as string
  const idpIntentToken = route.query.token as string
  const authRequestId = sessionStorage.getItem('oidcAuthRequestId')

  if (!idpIntentId || !idpIntentToken || !authRequestId) {
    error.value = true
    return
  }

  try {
    const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
    const { createIdpSession, finalizeOidcAuth } = useZitadelApi()

    // Create a Zitadel session from the IdP intent
    // Pass userId if Zitadel included it (user already exists in Zitadel)
    const userId = (route.query.user as string) || undefined
    const session = await createIdpSession(idpIntentId, idpIntentToken, userId)

    /*
     * The IdP returned no name (notably Apple, which only sends it on the
     * first-ever authorization), so the backend created a placeholder
     * account. Capture first/last name before finalize; identical to the
     * OTP signup flow, reusing the same ProfileNameForm screen.
     */
    if (session.requiresProfile) {
      idpSessionId = session.sessionId
      idpSessionToken = session.sessionToken
      pendingAuthRequestId = authRequestId
      needsProfile.value = true
      return
    }

    // Finalize the OIDC auth request with this session
    const result = await finalizeOidcAuth(authRequestId, session.sessionId, session.sessionToken)
    redirectToCallback(result.callbackUrl)
  } catch (e: any) {
    if (isIdpSignInCancelled(e)) {
      cancelled.value = true
      return
    }
    reportError(e, 'auth.idpCallback')
    const status = e?.response?.status || e?.statusCode
    if (status === 429) {
      rateLimited.value = true
    } else {
      error.value = true
    }
  }
})

const onSubmitProfile = async (payload: { firstName: string; lastName: string }) => {
  profileError.value = ''
  profileLoading.value = true
  try {
    const { useZitadelApi } = await import('#engine/composables/useZitadelApi')
    const { completeOtpProfile, finalizeOidcAuth } = useZitadelApi()

    /*
     * The complete-profile endpoint is session-based: it updates the
     * placeholder name on the session's user, so it works for IdP
     * sessions too (despite the OTP-flavoured name).
     */
    await completeOtpProfile({
      sessionId: idpSessionId,
      sessionToken: idpSessionToken,
      firstName: payload.firstName,
      lastName: payload.lastName,
    })

    const result = await finalizeOidcAuth(pendingAuthRequestId, idpSessionId, idpSessionToken)
    redirectToCallback(result.callbackUrl)
  } catch (e: any) {
    profileLoading.value = false
    reportError(e, 'auth.idpProfileCompletion')
    const status = e?.response?.status || e?.statusCode
    profileError.value =
      status === 429 ? t('notify.errors.tooManyRequests') : t('notify.errors.requestFailed')
  }
}
</script>
