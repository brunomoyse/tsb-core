<template>
  <div>
    <header>
      <Navbar />
      <!-- Spacer to prevent content from being hidden behind the fixed Navbar -->
      <div class="h-20"></div>
    </header>
    <main>
      <slot />
    </main>
    <footer></footer>
  </div>
</template>

<script lang="ts" setup>

</script>

<style>

</style>