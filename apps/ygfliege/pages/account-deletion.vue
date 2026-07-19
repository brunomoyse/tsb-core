<template>
    <div class="mx-auto max-w-3xl px-6 py-10">
        <!-- Header -->
        <header class="mb-10 text-center">
            <p class="text-sm font-semibold uppercase tracking-wide text-ygf-orange-600">{{ brand.name }}</p>
            <h1 class="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {{ t('accountDeletion.title') }}
            </h1>
            <p class="mt-3 text-sm text-gray-500">{{ t('accountDeletion.lastUpdated') }}</p>
        </header>

        <!-- Body -->
        <div class="space-y-10 text-[15px] leading-relaxed text-gray-700">
            <section>
                <p>{{ t('accountDeletion.intro') }}</p>
            </section>

            <!-- How to delete (in-app, self-service) -->
            <section>
                <h2 class="ad-heading">{{ t('accountDeletion.howTitle') }}</h2>
                <p>{{ t('accountDeletion.howBody') }}</p>
            </section>

            <!-- Fallback: can't sign in -->
            <section>
                <h2 class="ad-heading">{{ t('accountDeletion.fallbackTitle') }}</h2>
                <p>{{ t('accountDeletion.fallbackBody') }}</p>

                <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
                    <a
                        :href="mailtoHref"
                        class="text-lg font-semibold text-ygf-orange-600 underline break-all"
                    >{{ deletionEmail }}</a>
                </div>
            </section>

            <!-- Data deleted -->
            <section>
                <h2 class="ad-heading">{{ t('accountDeletion.dataTitle') }}</h2>
                <p>{{ t('accountDeletion.dataIntro') }}</p>
                <ul class="ad-list">
                    <li v-for="(item, i) in dataItems" :key="i">{{ item }}</li>
                </ul>
            </section>

            <!-- Data retained -->
            <section>
                <h2 class="ad-heading">{{ t('accountDeletion.retainTitle') }}</h2>
                <p>{{ t('accountDeletion.retainBody') }}</p>
            </section>

            <!-- Processing time -->
            <section>
                <h2 class="ad-heading">{{ t('accountDeletion.timingTitle') }}</h2>
                <p>{{ t('accountDeletion.timingBody') }}</p>
                <p class="mt-2">{{ t('accountDeletion.contactBody') }}</p>
            </section>
        </div>

        <!-- Footer -->
        <footer class="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
            <p>{{ brand.name }} &middot; {{ brand.address.street }} &middot; {{ brand.address.postal }} {{ brand.address.city }}, Belgique</p>
        </footer>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    public: true,
    sitemap: { priority: 0.5, changefreq: 'yearly' },
})

const config = useRuntimeConfig()
const { t, tm, rt } = useI18n()
const { brand } = useAppConfig()

const { deletionEmail } = brand
const mailtoHref = computed(
    () => `mailto:${deletionEmail}?subject=${encodeURIComponent(t('accountDeletion.emailSubject'))}`,
)

// Resolve the message array: tm() returns raw entries, rt() turns each into a string.
const dataItems = computed(() =>
    (tm('accountDeletion.dataItems') as unknown[]).map((m) => rt(m as string)),
)

useJsonLd([
    {
        '@type': 'WebPage',
        name: t('schema.accountDeletion.title'),
        description: t('schema.accountDeletion.description'),
    },
    breadcrumbList([
        { name: t('schema.breadcrumb.home'), item: `${config.public.baseUrl}/` },
        { name: t('schema.breadcrumb.accountDeletion'), item: `${config.public.baseUrl}/account-deletion` },
    ]),
], 'page-jsonld')

useSeoMeta({
    title: t('schema.accountDeletion.title'),
    ogType: 'article',
    ogTitle: t('schema.accountDeletion.title'),
    description: t('schema.accountDeletion.description'),
    ogDescription: t('schema.accountDeletion.description'),
    ogImage: `${config.public.baseUrl}/images/about-hero.png`,
    twitterCard: 'summary_large_image',
    ...useLocaleSeoMeta(),
})
</script>

<style scoped>
.ad-heading {
    @apply mb-3 text-lg font-semibold text-gray-900;
}

.ad-list {
    @apply mt-2 list-disc space-y-1 pl-5;
}
</style>
