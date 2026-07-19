<template>
    <picture>
        <source :srcset="srcset('avif')" :sizes="sizes" type="image/avif" />
        <source :srcset="srcset('webp')" :sizes="sizes" type="image/webp" />
        <img
            :src="`${src}-${fallbackWidth}.png`"
            :alt="alt"
            :sizes="sizes"
            :width="fallbackWidth"
            :loading="eager ? 'eager' : 'lazy'"
            :fetchpriority="eager ? 'high' : undefined"
            :class="imgClass"
            decoding="async"
        />
    </picture>
</template>

<script setup lang="ts">
// Responsive <picture> for the official YGF asset sets: every set ships
// AVIF+WebP at all widths and a single PNG fallback (e.g.
// /images/broths/beef-bone-{480,800,1200}.{avif,webp} + beef-bone-800.png).
const props = defineProps<{
    /** Extension-less base path, e.g. "/images/broths/beef-bone" */
    src: string
    /** Available widths, e.g. [480, 800, 1200] */
    widths: number[]
    /** Width that has the .png fallback file */
    fallbackWidth: number
    alt: string
    sizes?: string
    eager?: boolean
    imgClass?: string
}>()

const srcset = (ext: string) =>
    props.widths.map((w) => `${props.src}-${w}.${ext} ${w}w`).join(', ')
</script>
