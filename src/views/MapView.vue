<script setup lang="ts">
import { onMounted } from 'vue'
import locations from '@/assets/markerInformation/locations.json'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function layerAdd(layer) {
  if (layer.name == 'Overworld') {
    document.getElementById('map').style.backgroundColor = '#3b85b9'
  } else {
    document.getElementById('map').style.backgroundColor = '#000000'
  }
}

onMounted(() => {
  const bounds = [
    [0, 0],
    [1024, 1024],
  ]

  // Initialize the map
  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxBounds: bounds,
    maxBoundsViscosity: 1,
  }).fitBounds(bounds)

  const overworldLayers = L.layerGroup()
  const underworldLayers = L.layerGroup()
  const skyLayers = L.layerGroup()

  L.imageOverlay(
    'https://highspell.com:8887/static/assets/heightmaps/earthoverworldtexture.png',
    bounds,
  ).addTo(overworldLayers)
  L.imageOverlay(
    'https://highspell.com:8887/static/assets/heightmaps/earthoverworldmap.png',
    bounds,
  ).addTo(overworldLayers)

  L.imageOverlay(
    'https://highspell.com:8887/static/assets/heightmaps/earthskytexture.png',
    bounds,
  ).addTo(skyLayers)
  L.imageOverlay(
    'https://highspell.com:8887/static/assets/heightmaps/earthskymap.png',
    bounds,
  ).addTo(skyLayers)

  L.imageOverlay(
    'https://highspell.com:8887/static/assets/heightmaps/earthundergroundtexture.png',
    bounds,
  ).addTo(underworldLayers)
  L.imageOverlay(
    'https://highspell.com:8887/static/assets/heightmaps/earthundergroundmap.png',
    bounds,
  ).addTo(underworldLayers)

  const baseMaps = {
    Sky: skyLayers,
    Overworld: overworldLayers,
    Underworld: underworldLayers,
  }

  const overlayMaps = {}

  const layerControls = L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map)
  overworldLayers.addTo(map)
  locations.locations.forEach((location) => {
    // Text Marker
    const marker = L.marker([location.y + 512, location.x + 512], {
      icon: L.divIcon({
        className: 'text-label',
        html: `<div class="marker" style="font-size:1rem;color:white;transform:translate(-200%, -50%);white-space:nowrap;text-shadow: 0px 0px 6px black;">${location.name}</div>`,
      }),
    })
    marker.addTo(map)
  })

  map.on('baselayerchange', (e) => {
    layerAdd(e)
    map.fitBounds(bounds)
  })

  map.fitBounds(bounds)
})
</script>

<template>
  <main>
    <!-- Leaflet Map -->
    <div id="map"></div>
  </main>
</template>

<style scoped>
/* Main should take up the rest of the screen not taken up by the header */
main {
  text-align: center;
  height: calc(100vh - 75px); /* Adjust based on header height */
}
#map {
  height: 100%;
  width: 100%;
  position: relative;
  z-index: 1; /* Ensure the map is above the background */
  background-color: #3b85b9; /* Default color for overworld */
}
</style>
