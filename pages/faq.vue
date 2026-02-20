<template>
    <section class="max-w-4xl mx-auto p-6 pt-8 space-y-8">
        <!-- Header -->
        <div class="text-center space-y-2">
            <h1 class="text-4xl font-bold">{{ $t('faq.title') }}</h1>
            <p class="text-lg text-gray-600">{{ $t('faq.subtitle') }}</p>
        </div>

        <!-- FAQ Items -->
        <div class="space-y-4">
            <details
                v-for="(faq, index) in faqs"
                :key="index"
                class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
                <summary class="font-semibold text-lg cursor-pointer hover:text-tsb-red transition-colors">
                    {{ faq.question }}
                </summary>
                <!-- Safe: content sourced from i18n translation files, not user input -->
                <div class="mt-3 text-gray-700 leading-relaxed" v-html="faq.answer"></div>
            </details>
        </div>

        <!-- Contact CTA -->
        <div class="text-center pt-6">
            <p class="text-gray-600 mb-4">{{ $t('faq.stillHaveQuestions') }}</p>
            <NuxtLinkLocale
                to="/contact"
                class="inline-block bg-tsb-red text-white py-3 px-6 rounded-md font-semibold hover:bg-tsb-red-darker transition"
            >
                {{ $t('faq.contactUs') }}
            </NuxtLinkLocale>
        </div>
    </section>
</template>

<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig()

// FAQ data
const faqs = computed(() => [
    {
        question: t('faq.questions.delivery.question'),
        answer: t('faq.questions.delivery.answer')
    },
    {
        question: t('faq.questions.hours.question'),
        answer: t('faq.questions.hours.answer')
    },
    {
        question: t('faq.questions.halal.question'),
        answer: t('faq.questions.halal.answer')
    },
    {
        question: t('faq.questions.discount.question'),
        answer: t('faq.questions.discount.answer')
    },
    {
        question: t('faq.questions.payment.question'),
        answer: t('faq.questions.payment.answer')
    },
    {
        question: t('faq.questions.allergens.question'),
        answer: t('faq.questions.allergens.answer')
    },
    {
        question: t('faq.questions.invoice.question'),
        answer: t('faq.questions.invoice.answer')
    },
    {
        question: t('faq.questions.freshness.question'),
        answer: t('faq.questions.freshness.answer')
    },
    {
        question: t('faq.questions.parking.question'),
        answer: t('faq.questions.parking.answer')
    }
])

// FAQPage Schema
useSchemaOrg([
    defineWebPage({
        '@type': 'FAQPage',
        name: t('faq.schemaTitle'),
        description: t('faq.schemaDescription'),
        mainEntity: faqs.value.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    }),
    {
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: t('schema.breadcrumb.home'),
                item: config.public.baseUrl
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: t('faq.breadcrumb'),
                item: `${config.public.baseUrl}/faq`
            }
        ]
    }
])

useSeoMeta({
    title: t('faq.schemaTitle'),
    ogTitle: t('faq.schemaTitle'),
    description: t('faq.schemaDescription'),
    ogDescription: t('faq.schemaDescription'),
    ogImage: config.public.baseUrl + '/images/about-hero.png',
    twitterCard: 'summary_large_image',
})
</script>
