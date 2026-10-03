<template>
  <section class="max-w-4xl mx-auto p-6 pt-8 space-y-8">
    <!-- Header -->
    <div class="text-center space-y-2">
      <PageTitle>{{ $t('faq.title') }}</PageTitle>
      <p class="text-lg text-neutral-600">{{ $t('faq.subtitle') }}</p>
      <!-- Decorative fan motif -->
      <div class="flex justify-center pt-1" aria-hidden="true">
        <svg class="w-8 h-5 text-primary-300/40" viewBox="0 0 40 24" fill="none">
          <path d="M20 22 L5 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
          <path d="M20 22 L12 3" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
          <path d="M20 22 L20 1" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
          <path d="M20 22 L28 3" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
          <path d="M20 22 L35 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
          <path
            d="M5 6 Q12 0 20 1 Q28 0 35 6"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>

    <!-- FAQ Items -->
    <div class="space-y-4">
      <details
        v-for="(faq, index) in faqs"
        :key="index"
        class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
      >
        <summary
          class="font-semibold text-lg cursor-pointer hover:text-primary-900 transition-colors"
        >
          {{ faq.question }}
        </summary>
        <!-- Safe: content sourced from i18n translation files, not user input -->
        <div class="mt-3 text-neutral-700 leading-relaxed" v-html="faq.answer"></div>
      </details>
    </div>

    <!-- Contact CTA -->
    <div class="text-center pt-6">
      <p class="text-neutral-600 mb-4">{{ $t('faq.stillHaveQuestions') }}</p>
      <UiButton to="/contact" size="lg">
        {{ $t('faq.contactUs') }}
      </UiButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useLocalizedUrl } from '#engine/composables/useLocalizedUrl'
definePageMeta({
  sitemap: { priority: 0.6, changefreq: 'monthly' },
})

const { t } = useI18n()
const localizedUrl = useLocalizedUrl()
const { policyParams } = useOrderingPolicy()

// FAQ data. Each brand lists its own `faq.questions.*` keys in brand.faqQuestions.
const DEFAULT_QUESTIONS = ['delivery', 'hours', 'payment', 'allergens']
const questionKeys = useAppConfig().brand.faqQuestions ?? DEFAULT_QUESTIONS
const faqs = computed(() =>
  questionKeys.map((key: string) => ({
    question: t(`faq.questions.${key}.question`),
    answer: t(`faq.questions.${key}.answer`, policyParams.value),
  })),
)

useJsonLd(
  [
    {
      '@type': 'FAQPage',
      name: t('faq.schemaTitle'),
      description: t('faq.schemaDescription'),
      mainEntity: faqs.value.map((faq: { question: string; answer: string }) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    breadcrumbList([
      { name: t('schema.breadcrumb.home'), item: localizedUrl() },
      { name: t('faq.breadcrumb'), item: localizedUrl('/faq') },
    ]),
  ],
  'page-jsonld',
)

useSeoMeta({
  title: t('faq.schemaTitle'),
  ogType: 'website',
  ogTitle: t('faq.schemaTitle'),
  description: t('faq.schemaDescription'),
  ogDescription: t('faq.schemaDescription'),
  ...useLocaleSeoMeta(),
})
</script>
