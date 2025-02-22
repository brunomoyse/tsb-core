<template>
  <section class="max-w-5xl mx-auto p-6 space-y-12">
    <!-- Hero Section -->
    <div class="relative h-64 sm:h-96 overflow-hidden rounded-lg shadow-lg">
      <img src="/images/about-hero.png" alt="Tokyo Sushi Bar" class="absolute inset-0 w-full h-full object-cover" />
      <div
        class="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-center text-white px-4">
        <h1 class="text-4xl font-bold">{{ $t('about.heroTitle') }}</h1>
        <p class="mt-4 text-lg">{{ $t('about.heroSubtitle') }}</p>
      </div>
    </div>

    <!-- Our Story Section -->
    <div class="px-4">
      <h2 class="text-3xl font-bold text-center mb-4">{{ $t('about.ourStoryTitle') }}</h2>
      <p class="text-gray-700 text-center max-w-3xl mx-auto">
        {{ $t('about.ourStoryText') }}
      </p>
    </div>

    <!-- Our Values Section -->
    <div class="px-4">
      <h2 class="text-3xl font-bold text-center mb-6">{{ $t('about.ourValuesTitle') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div class="flex flex-col items-center text-center">
          <span class="text-4xl mb-2">🌿</span>
          <h3 class="font-semibold">{{ $t('about.valueFresh') }}</h3>
          <p class="text-gray-600">{{ $t('about.valueFreshDesc') }}</p>
        </div>
        <div class="flex flex-col items-center text-center">
          <span class="text-4xl mb-2">🏆</span>
          <h3 class="font-semibold">{{ $t('about.valueExcellence') }}</h3>
          <p class="text-gray-600">{{ $t('about.valueExcellenceDesc') }}</p>
        </div>
        <div class="flex flex-col items-center text-center">
          <span class="text-4xl mb-2">💡</span>
          <h3 class="font-semibold">{{ $t('about.valueInnovation') }}</h3>
          <p class="text-gray-600">{{ $t('about.valueInnovationDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- Meet the Team Section -->
    <div class="px-4">
      <h2 class="text-3xl font-bold text-center mb-6">{{ $t('about.meetTheTeamTitle') }}</h2>
      <div class="flex justify-center gap-12">
        <div class="flex flex-col items-center">
          <img src="/images/chef.png" alt="Chef Zhu Mengmeng" class="w-32 h-32 rounded-full object-cover shadow-md" />
          <h3 class="mt-4 font-semibold">{{ $t('about.chefName') }}</h3>
          <p class="text-gray-600">{{ $t('about.chefRole') }}</p>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/waitress.png" alt="Xu Sa" class="w-32 h-32 rounded-full object-cover shadow-md" />
          <h3 class="mt-4 font-semibold">{{ $t('about.waitressName') }}</h3>
          <p class="text-gray-600">{{ $t('about.waitressRole') }}</p>
        </div>
      </div>
    </div>

    <!-- Call-to-Action Section -->
    <div class="text-center px-4">
      <h2 class="text-3xl font-bold mb-4">{{ $t('about.ctaTitle') }}</h2>
      <p class="text-gray-700 mb-6 max-w-xl mx-auto">{{ $t('about.ctaText') }}</p>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <NuxtLinkLocale
          class="inline-block bg-tsb-red text-white py-3 px-6 rounded-md text-lg font-semibold hover:bg-tsb-red-darker transition"
          to="menu">
          {{ $t('about.ctaButtonOrder') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          class="inline-block bg-gray-800 text-white py-3 px-6 rounded-md text-lg font-semibold hover:bg-gray-900 transition"
          to="reservations">
          {{ $t('about.ctaButtonReserve') }}
        </NuxtLinkLocale>
      </div>
    </div>
  </section>
</template>