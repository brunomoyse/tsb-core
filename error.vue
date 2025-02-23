<template>
    <div class="min-h-screen flex flex-col items-center justify-center bg-tsb-one px-4 text-center">
      <!-- Round Maneki Neko Avatar -->
      <img 
        src="/images/404-maneki-neko.png" 
        alt="Lost Maneki Neko" 
        class="w-64 h-64 sm:w-80 sm:h-80 mb-6 rounded-full object-cover"
      />
  
      <!-- Simple Message -->
      <p class="text-lg text-gray-600 mb-6">
        {{ $t('404.message') }}
      </p>
  
      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <a
          href="/"
          class="px-6 py-3 border border-gray-300 text-gray-800 rounded hover:bg-gray-100 transition duration-200"
        >
          {{ $t('404.homeButton') }}
        </a>
        <a
          href="/menu"
          class="px-6 py-3 border border-gray-300 text-gray-800 rounded hover:bg-gray-100 transition duration-200"
        >
          {{ $t('404.menuButton') }}
        </a>
      </div>
    </div>
  </template>
  
  <script setup>
  // No additional script is needed for this static 404 page.
  </script>
  
  <style scoped>
  /* You can adjust the background color if you want a different pastel shade. */
  </style>