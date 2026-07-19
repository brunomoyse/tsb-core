<template>
    <section ref="band" class="relative overflow-hidden bg-ygf-black" :aria-label="$t('mkt.home.video.label')">
        <video
            ref="video"
            class="absolute inset-0 w-full h-full object-cover opacity-60"
            muted
            loop
            playsinline
            preload="none"
            poster="/images/videos/ingredients-poster.jpg"
            aria-hidden="true"
        >
            <source data-src="/videos/ingredients-loop.webm" type="video/webm" />
            <source data-src="/videos/ingredients-loop.mp4" type="video/mp4" />
        </video>
        <div class="absolute inset-0 bg-gradient-to-t from-ygf-black/70 via-transparent to-ygf-black/40" aria-hidden="true" />
        <div v-reveal class="relative max-w-4xl mx-auto text-center px-4 py-24 sm:py-32">
            <span class="text-ygf-light text-sm font-semibold uppercase tracking-widest">{{ $t('mkt.home.video.label') }}</span>
            <h2 class="font-display font-bold text-3xl sm:text-4xl text-white mt-3 mb-4">{{ $t('mkt.home.video.title') }}</h2>
            <p class="text-white/80 leading-relaxed max-w-2xl mx-auto">{{ $t('mkt.home.video.subtitle') }}</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Full-bleed looping ingredient video. Sources are swapped in lazily when the
// band nears the viewport so the ~3MB files never block initial load; autoplay
// is muted + playsinline (mobile-safe) and skipped for reduced-motion users.
const band = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const v = video.value
            if (v && !v.src && v.children.length) {
                for (const source of Array.from(v.querySelectorAll('source'))) {
                    const src = source.getAttribute('data-src')
                    if (src) source.setAttribute('src', src)
                }
                v.load()
                v.play().catch(() => { /* autoplay refused — poster stays */ })
            }
            observer?.disconnect()
        }
    }, { rootMargin: '200px' })
    if (band.value) observer.observe(band.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>
