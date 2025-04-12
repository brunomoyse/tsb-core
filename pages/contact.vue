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
                :src="osmEmbedUrl"
                class="w-full h-64 sm:h-80 rounded-lg shadow-lg"
                frameborder="0"
                marginheight="0"
                marginwidth="0"
                scrolling="no"
                title="Tokyo Sushi Bar Location">
            </iframe>
            <p class="text-right text-sm mt-1 w-full">
                <a :href="googleMapsLink" class="text-blue-500 hover:underline" rel="noopener noreferrer"
                   target="_blank">
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
                            <a :href="googleMapsLink" class="text-blue-500 hover:underline" rel="noopener noreferrer"
                               target="_blank">
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
                            <a class="text-blue-500 hover:underline" href="tel:+32422298888">
                                +32 4 222 98 88
                            </a>
                        </p>
                    </div>
                </div>
                <!-- Email -->
                <!--
                <div class="flex items-center space-x-3">
                    <span class="text-2xl">✉️</span>
                    <div>
                        <h2 class="font-semibold">{{ $t('contact.emailTitle') }}</h2>
                        <p>
                            <a class="text-blue-500 hover:underline" href="mailto:contact@tokyosushibarliege.be">
                                contact@tokyosushibarliege.be
                            </a>
                        </p>
                    </div>
                </div>
                -->
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
            <a class="hover:opacity-80" href="https://www.instagram.com/tokyo_sushi_bar_liege/" rel="noopener noreferrer"
               target="_blank">
                <img alt="Instagram" class="w-8 h-8" src="/icons/instagram-icon.svg"/>
            </a>
            <a class="hover:opacity-80" href="https://www.facebook.com/sushiliege" rel="noopener noreferrer"
               target="_blank">
                <img alt="Facebook" class="w-8 h-8" src="/icons/facebook-icon.svg"/>
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
