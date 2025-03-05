<template>
  <section class="max-w-5xl mx-auto p-6 space-y-10">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-2">{{ $t('contact.title') }}</h1>
      <p class="text-lg text-gray-600">{{ $t('contact.subtitle') }}</p>
    </div>

    <!-- Embedded Map -->
    <div class="flex flex-col items-center">
      <iframe
        class="w-full h-64 sm:h-80 rounded-lg shadow-lg"
        frameborder="0"
        scrolling="no"
        marginheight="0"
        marginwidth="0"
        :src="osmEmbedUrl"
        title="Tokyo Sushi Bar Location">
      </iframe>
      <p class="text-right text-sm mt-1 w-full">
        <a :href="googleMapsLink" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">
          {{ $t('contact.viewLargerMap') }}
        </a>
      </p>
    </div>

    <!-- Contact Information -->
    <div class="flex justify-center">
      <div class="inline-grid grid-cols-1 sm:grid-cols-2 gap-6">
        <!-- Address -->
        <div class="flex items-center space-x-3">
          <span class="text-2xl">📌</span>
          <div>
            <h2 class="font-semibold">{{ $t('contact.addressTitle') }}</h2>
            <p>
              <a :href="googleMapsLink" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">
                {{ $t('contact.address') }}
              </a>
            </p>
          </div>
        </div>
        <!-- Phone -->
        <div class="flex items-center space-x-3">
          <span class="text-2xl">📞</span>
          <div>
            <h2 class="font-semibold">{{ $t('contact.phoneTitle') }}</h2>
            <p>
              <a href="tel:+32422298888" class="text-blue-500 hover:underline">
                +32 4 222 98 88
              </a>
            </p>
          </div>
        </div>
        <!-- Email -->
        <div class="flex items-center space-x-3">
          <span class="text-2xl">✉️</span>
          <div>
            <h2 class="font-semibold">{{ $t('contact.emailTitle') }}</h2>
            <p>
              <a href="mailto:contact@tokyosushibarliege.be" class="text-blue-500 hover:underline">
                contact@tokyosushibarliege.be
              </a>
            </p>
          </div>
        </div>
        <!-- Reservations -->
        <div class="flex items-center space-x-3">
          <span class="text-2xl">🍽️</span>
          <div>
            <h2 class="font-semibold">{{ $t('contact.reservationsTitle') }}</h2>
            <p>
              <NuxtLinkLocale to="reservation" class="text-blue-500 hover:underline">
                {{ $t('contact.reservationsLink') }}
                </NuxtLinkLocale>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Opening Hours -->
    <div class="max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-center mb-4">{{ $t('contact.openingHoursTitle') }}</h2>
      <table class="w-full border border-gray-200 shadow-md text-center">
        <thead class="bg-gray-100">
          <tr>
            <th class="py-2 px-4 border-b">{{ $t('contact.day') }}</th>
            <th class="py-2 px-4 border-b">{{ $t('contact.hours') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="py-2 px-4 border-b">{{ $t('contact.weekdays') }}</td>
            <td class="py-2 px-4 border-b">12:00 - 14:30 | 18:00 - 22:30</td>
          </tr>
          <tr>
            <td class="py-2 px-4">{{ $t('contact.weekends') }}</td>
            <td class="py-2 px-4">12:00 - 15:00 | 18:00 - 23:00</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Social Media Links -->
    <div class="flex justify-center space-x-6 mt-8">
      <a href="https://www.instagram.com/tokyo_sushi_bar_liege/" target="_blank" rel="noopener noreferrer" class="hover:opacity-80">
        <img src="/icons/instagram-icon.svg" alt="Instagram" class="w-8 h-8" />
      </a>
      <a href="https://www.facebook.com/sushiliege" target="_blank" rel="noopener noreferrer" class="hover:opacity-80">
        <img src="/icons/facebook-icon.svg" alt="Facebook" class="w-8 h-8" />
      </a>
    </div>
  </section>
</template>

<script setup>
const latitude = 50.642394;
const longitude = 5.574711;
const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.001},${latitude - 0.001},${longitude + 0.001},${latitude + 0.001}&layer=mapnik&marker=${latitude},${longitude}`;
const googleMapsLink = `https://maps.app.goo.gl/XFqBuvzaAPzev7Tn7`;
</script>

<style scoped>
table {
  border-collapse: collapse;
}
th, td {
  border: 1px solid #e5e7eb; /* Tailwind gray-200 */
}
</style>