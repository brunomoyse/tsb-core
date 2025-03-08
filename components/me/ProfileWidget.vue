<template>
    <article
        class="rounded-2xl bg-tsb-two p-6 shadow-sm transition-all hover:shadow-md"
        aria-labelledby="personal-info-heading"
    >
        <header class="border-b border-gray-100 pb-4">
            <h2
                id="personal-info-heading"
                class="text-lg font-semibold text-gray-900"
            >
                {{ $t('me.profile.title') }}
            </h2>
        </header>

        <dl class="mt-4 space-y-4">
            <div class="flex items-center justify-between">
                <dt class="text-gray-500">{{ $t('me.profile.name') }}</dt>
                <dd class="font-medium" :title="authStore?.user?.name">
                    {{ authStore?.user?.name || '–' }}
                </dd>
            </div>

            <div class="flex items-center justify-between">
                <dt class="text-gray-500">{{ $t('me.profile.email') }}</dt>
                <dd class="font-medium">
                    <span class="text-gray-900">
                        {{ authStore?.user?.email || '–' }}
                    </span>
                </dd>
            </div>

            <div class="flex items-center justify-between">
                <dt class="text-gray-500">{{ $t('me.profile.address') }}</dt>
                <dd class="font-medium" :title="authStore?.user?.address">
                    {{ authStore?.user?.address || '–' }}
                </dd>
            </div>

            <div class="flex items-center justify-between">
                <dt class="text-gray-500">{{ $t('me.profile.phoneNumber') }}</dt>
                <dd class="font-medium">
                    <a
                        v-if="authStore?.user?.phoneNumber"
                        :href="`tel:${authStore.user.phoneNumber}`"
                        class="hover:text-blue-600 transition-colors"
                    >
                        {{ authStore.user.phoneNumber }}
                    </a>
                    <span v-else>–</span>
                </dd>
            </div>
        </dl>

        <footer class="mt-6">
            <button
                type="button"
                class="w-full rounded-lg bg-blue-100 px-4 py-2 text-blue-700 hover:bg-blue-200 transition-colors"
                aria-label="{{ $t('me.profile.update') }}"
            >
                {{ $t('me.profile.update') }}
            </button>
        </footer>
    </article>
</template>

<script lang="ts" setup>
import { useAuthStore } from "~/stores/auth"

const authStore = useAuthStore()
</script>
