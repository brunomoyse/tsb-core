<template>
    <div class="bg-tsb-gray min-h-screen flex flex-col">
        <!-- Petal animation container -->
        <section class="homescreen flex-1 bg-white relative">
            <!-- Centered content -->
            <div class="min-h-screen flex flex-col justify-center items-center px-4">
                <!-- Logo -->
                <div class="mb-8 flex flex-col items-center text-center">
                    <TokyoSushiLogo/>
                </div>

                <!-- Links Container -->
                <div class="flex flex-col md:flex-row md:space-x-12 space-y-8 md:space-y-0 items-center">

                    <!-- Commander -->
                    <NuxtLinkLocale to="menu">
                        {{ $t('home.menu') }}
                    </NuxtLinkLocale>

                    <!-- Réserver -->
                    <NuxtLinkLocale to="reservations">
                        {{ $t('home.book') }}
                    </NuxtLinkLocale>

                    <!-- Le restaurant -->
                    <NuxtLinkLocale to="about">
                        {{ $t('home.about') }}
                    </NuxtLinkLocale>

                    <!-- Contact -->
                    <NuxtLinkLocale to="contact">
                        {{ $t('home.contact') }}
                    </NuxtLinkLocale>
                </div>
            </div>
        </section>
    </div>
</template>

<script lang="ts" setup>
import Sakura from '@/lib/sakura';

// Sakura references
let sakura: Sakura | null = null;

definePageMeta({
    layout: false
})

// Mount logic for Sakura animation
onMounted(() => {
    setTimeout(() => {
        sakura = new Sakura('.homescreen');
    }, 1000);
});

onBeforeUnmount(() => {
    if (sakura) {
        sakura.stop(true);
    }
});
</script>

<style scoped>
.page-enter-active,
.page-leave-active {
    transition: all 0.4s;
}

.page-enter-from,
.page-leave-to {
    opacity: 0;
    filter: blur(1rem);
}
</style>
