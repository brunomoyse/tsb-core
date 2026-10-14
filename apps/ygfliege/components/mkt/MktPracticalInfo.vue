<template>
  <!-- "Infos pratiques" (audit 1a/1b): live status, the week's hours in one line, address with a Maps deep link,
       tap-to-call, and a map that does not catch the page's scroll (it opens Maps instead). -->
  <div class="practical" data-testid="practical-info">
    <div class="rounded-ygf-lg bg-white shadow-ygf-md p-5 sm:p-6 flex flex-col gap-5">
      <MktOpenStatus variant="card" />

      <hr class="border-ygf-border" />

      <div class="flex items-start gap-3">
        <span class="text-ygf-orange-on-white mt-0.5"
          ><MktIcon name="map-pin-fill" :size="22"
        /></span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-ygf-black">
            {{ brand.address.street }}, {{ brand.address.postal }} {{ brand.address.city }}
          </p>
          <a
            :href="brand.mapsUrl"
            target="_blank"
            rel="noopener"
            data-testid="practical-maps-link"
            class="btn btn-secondary btn-sm mt-3"
          >
            {{ $t('mkt.practical.openInMaps') }}
            <MktIcon name="arrow-square-out" :size="16" />
          </a>
        </div>
      </div>

      <hr class="border-ygf-border" />

      <div class="flex items-start gap-3">
        <span class="text-ygf-orange-on-white mt-0.5"><MktIcon name="phone" :size="22" /></span>
        <div class="min-w-0 flex-1 flex flex-col items-start gap-2">
          <a
            :href="telHref(brand.phone)"
            class="inline-flex min-h-11 items-center font-semibold text-ygf-black underline decoration-ygf-orange/40 underline-offset-4"
            >{{ brand.phone }}</a
          >
          <p class="rounded-ygf-card bg-ygf-bg px-3 py-2 text-sm text-ygf-orange-text">
            {{ $t('mkt.practical.bookingsByPhone') }}
          </p>
        </div>
      </div>
    </div>

    <!-- The old site's warm Leaflet map: one finger scrolls the page on a phone, the Maps link sits on the map -->
    <MktMap class="practical-map rounded-ygf-lg shadow-ygf-md" />
  </div>
</template>

<script setup lang="ts">
import MktIcon from '~/components/mkt/MktIcon.vue'
import MktMap from '~/components/mkt/MktMap.vue'
import MktOpenStatus from '~/components/mkt/MktOpenStatus.vue'
import { telHref } from '#engine/utils/phone'

const { brand } = useAppConfig()
</script>

<style scoped>
.practical {
  display: grid;
  gap: 1.25rem;
}

.practical-map {
  min-height: 240px;
}

@media (min-width: 1024px) {
  .practical {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 2rem;
  }

  .practical-map {
    min-height: 100%;
  }
}
</style>
