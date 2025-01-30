<script setup lang="ts">
import Sakura from '@/lib/sakura';

// Sakura references
let sakura: Sakura | null = null;

// Mount logic for Sakura animation
onMounted(() => {
  setTimeout(() => {
    sakura = new Sakura('.homescreen');
  }, 1000);
});

// Cleanup logic
onBeforeUnmount(() => {
  if (sakura) {
    sakura.stop(true);
  }
});
</script>

<template>
  <main class="bg-tsb-gray min-h-screen flex flex-col">
    <!-- Petal animation container -->
    <section class="homescreen flex-1 bg-white relative">
      <!-- Centered content -->
      <div class="min-h-screen flex flex-col justify-center items-center px-4">
        <!-- Logo -->
        <div class="mb-8 flex flex-col items-center text-center">
          <TokyoSushiLogo />
        </div>

        <!-- Links Container -->
        <div class="flex flex-col md:flex-row md:space-x-12 space-y-8 md:space-y-0 items-center">
          
          <!-- Commander -->
          <NuxtLink to="/menu">
            Menu
          </NuxtLink>
          
          <!-- Réserver -->
          <NuxtLink to="/booking">
            Réserver
          </NuxtLink>

          <!-- Le restaurant -->
          <NuxtLink to="/about">
            Le restaurant
          </NuxtLink>

          <!-- Contact -->
          <NuxtLink to="/contact">
            Contact
          </NuxtLink>
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
