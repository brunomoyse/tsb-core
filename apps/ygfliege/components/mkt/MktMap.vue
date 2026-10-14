<template>
  <!-- The old site's map (malatang map-embed.ts): Leaflet + OSM tiles tinted to the brand's warm cream/orange, the orange
       Phosphor pin on the address. Leaflet loads on demand, once the map nears the viewport: never in the first bundle. -->
  <div class="mkt-map" data-testid="mkt-map">
    <div
      ref="canvas"
      class="mkt-map-canvas"
      :aria-label="$t('contact.mapTitle', { name: brand.name })"
      role="img"
    />
    <!-- Open the address in Maps (icon only, like the old site's "open larger map") -->
    <a
      :href="brand.mapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mkt-map-link"
      :aria-label="$t('mkt.practical.openInMaps')"
      data-testid="map-open-link"
    >
      <MktIcon name="arrow-square-out" :size="18" />
    </a>
    <!-- OSM attribution (required), as a discreet credit instead of Leaflet's control -->
    <a
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noopener noreferrer"
      class="mkt-map-credit"
    >
      © OpenStreetMap
    </a>
  </div>
</template>

<script setup lang="ts">
import type { Map as LeafletMap } from 'leaflet'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import MktIcon from '~/components/mkt/MktIcon.vue'
import pinSvg from '~/assets/icons/map-pin-fill.svg?raw'

const ZOOM = 17

const { brand } = useAppConfig()
const canvas = useTemplateRef<HTMLDivElement>('canvas')

let observer: IntersectionObserver | null = null
let map: LeafletMap | null = null
let unmounted = false

async function loadMap(container: HTMLElement): Promise<void> {
  const [{ default: L }] = await Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ])
  if (unmounted) return
  const { lat, lng } = brand.geo
  // A phone scrolls the page with one finger: no dragging there (a pinch still zooms), and never the scroll wheel.
  const touch = window.matchMedia('(pointer: coarse)').matches
  map = L.map(container, {
    center: [lat, lng],
    zoom: ZOOM,
    scrollWheelZoom: false,
    dragging: !touch,
    attributionControl: false,
  })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  // The brand's marker: a real Leaflet marker (it follows the map), its tip on the address.
  const pin = L.divIcon({
    className: 'mkt-map-pin',
    html: pinSvg,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  })
  L.marker([lat, lng], { icon: pin, keyboard: false, interactive: false }).addTo(map)
}

onMounted(() => {
  const container = canvas.value
  if (!container) return
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer?.disconnect()
      observer = null
      void loadMap(container)
    },
    { rootMargin: '200px' },
  )
  observer.observe(container)
})

onBeforeUnmount(() => {
  unmounted = true
  observer?.disconnect()
  map?.remove()
  map = null
})
</script>

<style scoped>
.mkt-map {
  position: relative;
  overflow: hidden;
  background: var(--ygf-cream);
}

.mkt-map-canvas {
  position: absolute;
  inset: 0;
  background: var(--ygf-cream);
}

/* OSM tiles brought into the brand's warm world (cream/orange mono instead of blues and greens). Only the tile pane:
   the pin keeps its full colour. Same filter as the old site. */
.mkt-map :deep(.leaflet-tile-pane) {
  filter: grayscale(1) sepia(0.32) saturate(1.6) hue-rotate(-12deg) brightness(1.06) contrast(0.92);
}

/* main.css caps every element at max-width 100%: Leaflet's panes are 0 wide, which would squash the pin to nothing */
.mkt-map-canvas :deep(*) {
  max-width: none;
}

.mkt-map :deep(.leaflet-container) {
  background: var(--ygf-cream);
  font: inherit;
}

.mkt-map :deep(.mkt-map-pin) {
  color: var(--ygf-orange);
  filter: drop-shadow(0 3px 6px color-mix(in srgb, var(--ygf-orange-dark) 50%, transparent));
}

.mkt-map :deep(.mkt-map-pin svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.mkt-map-link {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 500;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ygf-white);
  color: var(--ygf-black);
  box-shadow: var(--shadow-md);
  transition: color 300ms ease-out;
}

.mkt-map-link:hover {
  color: var(--ygf-orange-on-white, var(--ygf-orange-dark));
}

.mkt-map-link:focus-visible {
  outline: 2px solid var(--ygf-orange-dark);
  outline-offset: 2px;
}

.mkt-map-credit {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ygf-white) 80%, transparent);
  color: var(--ygf-gray-600);
  font-size: 10px;
  line-height: 1.4;
  text-decoration: none;
}

.mkt-map-credit:hover {
  color: var(--ygf-orange-dark);
}
</style>
