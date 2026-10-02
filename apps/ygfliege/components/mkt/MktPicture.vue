<template>
    <picture>
        <source :srcset="srcset('avif')" :sizes="sizes" type="image/avif" />
        <source :srcset="srcset('webp')" :sizes="sizes" type="image/webp" />
        <img
            :src="`${src}-${fallbackWidth}.png`"
            :alt="alt"
            :sizes="sizes"
            :width="fallbackWidth"
            :height="fallbackHeight"
            :loading="eager ? 'eager' : 'lazy'"
            :fetchpriority="eager ? 'high' : undefined"
            :class="classes"
            decoding="async"
        />
    </picture>
</template>

<script setup lang="ts">
/*
 * Responsive <picture> for the official YGF asset sets: every set ships
 * AVIF+WebP at all widths and a single PNG fallback (e.g.
 * /images/broths/beef-bone-{480,800,1200}.{avif,webp} + beef-bone-800.png).
 *
 * width AND height are always emitted (those of the PNG fallback; every size of a set has the same ratio), so the browser
 * derives the aspect ratio and reserves the space before the image arrives. With width only, the box was 0px tall until
 * the file loaded and everything below or beside it jumped (audit PR 3.8, P4: the home hero text jumped ~175px). The
 * image is `h-auto` unless the caller sets its own height class (h-full, h-48...), in which case that wins.
 */
import { computed } from 'vue'

const props = defineProps<{
    /** Extension-less base path, e.g. "/images/broths/beef-bone" */
    src: string
    /** Available widths, e.g. [480, 800, 1200] */
    widths: number[]
    /** Width that has the .png fallback file */
    fallbackWidth: number
    /** Height of that .png fallback file: read it from the asset (`file x-800.png`), do not guess. */
    fallbackHeight: number
    alt: string
    sizes?: string
    eager?: boolean
    imgClass?: string
}>()

// A height utility of the caller (h-full, sm:h-64, ...; not max-h-/min-h-) replaces the default h-auto.
const HEIGHT_UTILITY = /(?:^|\s)(?:[\w[\]-]+:)*!?h-/u
const classes = computed(() => (props.imgClass && HEIGHT_UTILITY.test(props.imgClass) ? props.imgClass : ['h-auto', props.imgClass]))

const srcset = (ext: string) =>
    props.widths.map((w) => `${props.src}-${w}.${ext} ${w}w`).join(', ')
</script>
