<script setup lang="ts">
useHead({
  link: [{ rel: 'stylesheet', href: 'css/sakura.css' }]
})

import Sakura from '@/lib/sakura';

let sakura: Sakura | null = null;

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

<template>
    <main class="bg-tsb-gray">
        <section class="homescreen min-h-screen bg-white">
            <div class="min-h-screen flex justify-center items-center">
                <div class="flex flex-col items-center md:items-start justify-center mb-8">
                    <div class="flex flex-col items-center justify-center">
                        <TokyoSushiLogo />

                        <button
                            class="px-8 lg:text-2xl md:text-xl rounded-2xl h-16 text-tsb-gray font-semibold  bg-white border-tsb-red border-2 transition-all duration-300 shadow-md hover:shadow-lg hover:bg-tsb-pink transform hover:-translate-y-1">
                            <NuxtLink href="/menu">
                                LIVRAISON
                            </NuxtLink>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>


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