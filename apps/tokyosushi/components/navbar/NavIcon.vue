<template>
  <!-- Renders a monochrome SVG file as a mask so it takes the current text color. -->
  <span
    aria-hidden="true"
    class="inline-block shrink-0 select-none bg-current"
    :style="{
      maskImage: `url(${src})`,
      WebkitMaskImage: `url(${src})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
    }"
  />
</template>

<script lang="ts" setup>
const { src } = defineProps<{ src: string }>()
</script>
