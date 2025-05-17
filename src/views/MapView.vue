<script setup lang="ts">
import { onMounted } from 'vue'
import locations from '@/assets/markerInformation/Locations.json'
import entities from '@/assets/markerInformation/worldEntities.json'
import npcs from '@/assets/markerInformation/NPCs.json'
import npcDefinitions from '@/assets/markerInformation/NPCDefs.json'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function layerAdd(layer, levelMarkers, layerControls) {
  // Update the overlay layers based on the available level markers
  for (const key in levelMarkers) {
    if (key == layer.name) {
      for (const subKey in levelMarkers[key]) {
        if (levelMarkers[key][subKey]) {
          layerControls.addOverlay(levelMarkers[key][subKey], subKey)
        }
      }
    } else {
      for (const subKey in levelMarkers[key]) {
        if (levelMarkers[key][subKey]) {
          layerControls.removeLayer(levelMarkers[key][subKey])
          //  If layer is on the map, activate it for the new layer
          levelMarkers[key][subKey].remove()
        }
      }
    }
  }

  if (layer.name == 'Overworld') {
    document.getElementById('map').style.backgroundColor = '#3b85b9'
  } else {
    document.getElementById('map').style.backgroundColor = '#000000'
  }

  // Remove all layers from the map
  if (!layer || !layer.layer || layer.layer._map) {
    // Initial call does not have this defined
    return;
  }
  layer.layer._map.eachLayer((mapLayer) => {
    if (mapLayer && !(mapLayer instanceof L.imageOverlay)) {
      console.log(mapLayer)
      mapLayer.remove()
    }
  })

}

onMounted(() => {
  const bounds = [
    [0, 0],
    [1024, 1024],
  ]

  const levelMarkers = {
    Overworld: {},
    Underworld: {},
    Sky: {},
  }

  const searchMarkers = {
    Overworld: {},
    Underworld: {},
    Sky: {},
  }

  // Initialize the map
  const map: L.Map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxBoundsViscosity: 0.5,
  }).fitBounds(bounds)

  const overworldLayers = L.layerGroup()
  const underworldLayers = L.layerGroup()
  const skyLayers = L.layerGroup()
  L.imageOverlay('./mapImages/earthoverworldtexture.png', bounds).addTo(overworldLayers)
  L.imageOverlay('./mapImages/earthoverworldmap.png', bounds).addTo(overworldLayers)

  L.imageOverlay('./mapImages/earthskytexture.png', bounds).addTo(skyLayers)
  L.imageOverlay('./mapImages/earthskymap.png', bounds).addTo(skyLayers)

  L.imageOverlay('./mapImages/earthundergroundtexture.png', bounds).addTo(underworldLayers)
  L.imageOverlay('./mapImages/earthundergroundmap.png', bounds).addTo(underworldLayers)

  const baseMaps = {
    Sky: skyLayers,
    Overworld: overworldLayers,
    Underworld: underworldLayers,
  }

  function addItem(marker: L.Marker, level: string, group: string) {
    if (!levelMarkers[level][group]) {
      levelMarkers[level][group] = L.layerGroup()
    }

    if (!searchMarkers[level][marker.options.title]) {
      searchMarkers[level][marker.options.title] = []
    }
    marker.addTo(levelMarkers[level][group])
  }

  overworldLayers.addTo(map)

  locations.locations.forEach((location) => {
    // Text Marker
    const marker = new L.Marker([location.y + 512, location.x + 512], {
      icon: L.divIcon({
        className: 'text-label lvl-1',
        html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;color:white;text-shadow: 0px 0px 8px black;transform:translate(-200%, -50%);white-space:nowrap;">${location.name}</div>`,
      }),
      title: location.name,
    })
    switch(location.labelType) {
      case 0:
        addItem(marker, 'Underworld', 'Locations')
        break;
      case 1:
        addItem(marker, 'Overworld', 'Locations')
        break;
      case 2:
        addItem(marker, 'Sky', 'Locations')
        break;
    }
  })

  entities.worldEntities.forEach((entity) => {
    // Trees
    if (entity.type.includes('tree') && entity.type != 'treestump') {
      const name = entity.type.replace('tree', ' Tree')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Trees is Unicode: 🌳
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.165rem, -1.1rem);">🌳</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Trees')
          break
        case 0:
          addItem(marker, 'Underworld', 'Trees')
          break
        case 2:
          addItem(marker, 'Sky', 'Trees')
          break
      }
    }

    if (entity.type.includes('obelisk')) {
      const name = entity.type.replace('obelisk', ' Obelisk')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Obelisk is Unicode: 🗿
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, 0rem);">🗿</div>`,
        }),

        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"

      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Obelisks')
          break
        case 0:
          addItem(marker, 'Underworld', 'Obelisks')
          break
        case 2:
          addItem(marker, 'Sky', 'Obelisks')
          break
      }
    }

    if (entity.type.includes('rocks')) {
      const name = entity.type.replace('rocks', ' Rock')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Rocks is Unicode: 🪨
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🪨</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"

      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Ores')
          break
        case 0:
          addItem(marker, 'Underworld', 'Ores')
          break
        case 2:
          addItem(marker, 'Sky', 'Ores')
          break
      }
    }

    if (entity.type.includes('bank')) {
      const name = entity.type.replace('bank', ' Bank')
      const nameWithSpaces = name.replace('chest', ' Chest')
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Bank is Unicode: 💰
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">💰</div>`,
        }),
        title: nameWithSpaces,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"

      marker.bindPopup(nameWithSpaces)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Banks')
          break
        case 0:
          addItem(marker, 'Underworld', 'Banks')
          break
        case 2:
          addItem(marker, 'Sky', 'Banks')
          break
      }
    }

    if (entity.type.includes('fire')) {
      const name = entity.type.replace('fire', ' Fire')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Fire is Unicode: 🔥
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🔥</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Fires')
          break
        case 0:
          addItem(marker, 'Underworld', 'Fires')
          break
        case 2:
          addItem(marker, 'Sky', 'Fires')
          break
      }
    }

    if (entity.type.includes('smithingsource')) {
      const name = 'Anvil'

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Anvil is Unicode: 🔨
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🔨</div>`,
        }),
        title: name,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Anvils')
          break
        case 0:
          addItem(marker, 'Underworld', 'Anvils')
          break
        case 2:
          addItem(marker, 'Sky', 'Anvils')
          break
      }
    }

    if (entity.type.includes('smeltingsource')) {
      const name = 'Furnace'
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Smelting is Unicode: 🏭
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🏭</div>`,
        }),
        title: name,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Furnaces')
          break
        case 0:
          addItem(marker, 'Underworld', 'Furnaces')
          break
        case 2:
          addItem(marker, 'Sky', 'Furnaces')
          break
      }
    }

    if (entity.type.includes('kiln')) {
      const name = 'Kiln'
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Kiln is Unicode: ⚱️
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">⚱️</div>`,
        }),
        title: name,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Kilns')
          break
        case 0:
          addItem(marker, 'Underworld', 'Kilns')
          break
        case 2:
          addItem(marker, 'Sky', 'Kilns')
          break
      }
    }

    if (entity.type.includes('heatsource')) {
      const name = 'Stove'

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Heat Source is Unicode: 🍳
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🍳</div>`,
        }),
        title: name,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Stoves')
          break
        case 0:
          addItem(marker, 'Underworld', 'Stoves')
          break
        case 2:
          addItem(marker, 'Sky', 'Stoves')
          break
      }
    }

    if (entity.type.includes('fishing')) {
      const name = entity.type.replace('fishing', ' Fishing')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Fishing is Unicode: 🎣
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1.5rem;transform: translate(-0.35rem, -0.5rem);color:white;text-shadow: 0px 0px 8px black;">🎣</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Fishing Spots')
          break
        case 0:
          addItem(marker, 'Underworld', 'Fishing Spots')
          break
        case 2:
          addItem(marker, 'Sky', 'Fishing Spots')
          break
      }
    }

    if (entity.type.includes('pumpkin')) {
      const name = entity.type.replace('pumpkin', ' Pumpkin')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Pumpkin is Unicode: 🎃
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🎃</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('corn')) {
      const name = entity.type.replace('corn', ' Corn')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Corn is Unicode: 🌽
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🌽</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('potatoes')) {
      const name = entity.type.replace('potatoes', ' Potatoes')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Potatoes is Unicode: 🥔
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🥔</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('onion')) {
      const name = entity.type.replace('onion', ' Onion')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Onion is Unicode: 🧅
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🧅</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('flax')) {
      const name = entity.type.replace('flax', ' Flax')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Flax is Unicode: 🌾
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🌾</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"

      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('carrot')) {
      const name = entity.type.replace('carrot', ' Carrot')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Carrot is Unicode: 🥕
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🥕</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('redmushroom')) {
      const name = entity.type.replace('redmushroom', 'Red Mushroom')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Red Mushroom is Unicode: 🍄
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🍄</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('plant') && entity.type != 'plant') {
      const name = entity.type.replace('plant', ' Plant')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Plant is Unicode: 🌱
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🌱</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('strawberries')) {
      const name = entity.type.replace('strawberries', 'Strawberries')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Strawberries is Unicode: 🍓
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🍓</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('watermelon')) {
      const name = entity.type.replace('watermelon', 'Watermelon')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = L.marker([entity.z + 512, entity.x + 512], {
        // Icon for Watermelon is Unicode: 🍉
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🍉</div>`,
        }),
        title: nameWithSpacesCapitalized,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(nameWithSpacesCapitalized)
      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables')
          break
      }
    }
  })

  npcs.npcs.forEach((npc) => {
    // Check if NPC has a value for "shopdef_id"
    if (npc.shopdef_id) {
      // Capitalize characters after spaces
      const name = npc.desc.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
      const marker = L.marker([npc.y + 512, npc.x + 512], {
        // Icon for NPC is Unicode: 🏪
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">🏪</div>`,
        }),
        title: name,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (npc.mapLevel) {
        case 1:
          addItem(marker, 'Overworld', 'Shops')
          break
        case 0:
          addItem(marker, 'Underworld', 'Shops')
          break
        case 2:
          addItem(marker, 'Sky', 'Shops')
          break
      }
      return;
    }

    if (npc.isAlwaysAggroOverride) {
      // Capitalize characters after spaces
      const name = npc.desc.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
      const marker = L.marker([npc.y + 512, npc.x + 512], {
        // Icon for Aggro NPC is Devil: 😈
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">😈</div>`,
        }),
        title: name,
      })

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (npc.mapLevel) {
        case 1:
          addItem(marker, 'Overworld', 'Aggro NPCs')
          break
        case 0:
          addItem(marker, 'Underworld', 'Aggro NPCs')
          break
        case 2:
          addItem(marker, 'Sky', 'Aggro NPCs')
          break
      }
      return;
    }


    // Find the item in the npcDefinitions.npcDefs JSON array where npc._id == npcDef._id
    const npcDef = npcDefinitions.npcDefs.find(
      (npcDef) => npc.npcdef_id === npcDef._id
    )

    // Check if npcDef has a definition for "combat"
    if (!npcDef) {
      // Add Regular NPC
      // Capitalize characters after spaces
      const name = npc.desc.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
      const marker = L.marker([npc.y + 512, npc.x + 512], {
        // Icon for NPC is Unicode: 👤
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">👤</div>`,
        }),
        title: name,
      })
      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (npc.mapLevel) {
        case 1:
          addItem(marker, 'Overworld', 'NPCs')
          break
        case 0:
          addItem(marker, 'Underworld', 'NPCs')
          break
        case 2:
          addItem(marker, 'Sky', 'NPCs')
          break
      }
      return
    }
    // Check if npcDef has a value for "combat"
    if (!npcDef.combat) {
      // Add Regular NPC
      // Capitalize characters after spaces
      const name = npc.desc.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
      const marker = L.marker([npc.y + 512, npc.x + 512], {
        // Icon for NPC is Unicode: 👤
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">👤</div>`,
        }),
        title: name,
      })
      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (npc.mapLevel) {
        case 1:
          addItem(marker, 'Overworld', 'NPCs')
          break
        case 0:
          addItem(marker, 'Underworld', 'NPCs')
          break
        case 2:
          addItem(marker, 'Sky', 'NPCs')
          break
      }
      return
    }
    if (npcDef.combat) {
      // Add Attackable NPC
      // Capitalize characters after spaces
      const name = npc.desc.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
      const marker = L.marker([npc.y + 512, npc.x + 512], {
        // Icon for NPC is Unicode: ⚔️
        icon: L.divIcon({
          className: 'text-label lvl-1',
          html: `<div class="marker" style="font-size:1rem;color:white;text-shadow: 0px 0px 8px black;transform: translate(-0.35rem, -0.5rem);">⚔️</div>`,
        }),
        title: name,
      })
      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      marker.bindPopup(name)
      switch (npc.mapLevel) {
        case 1:
          addItem(marker, 'Overworld', 'Attackable NPCs')
          break
        case 0:
          addItem(marker, 'Underworld', 'Attackable NPCs')
          break
        case 2:
          addItem(marker, 'Sky', 'Attackable NPCs')
          break
      }
      return;
    }
  })

  const layerControls =
  L.control.layers(baseMaps, {}, { collapsed: true }).addTo(map)

  // Add Search Functionality via DOM
  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.placeholder = 'Search...'
  searchInput.style.position = 'absolute'
  searchInput.style.bottom = '10px'
  searchInput.style.left = '10px'
  searchInput.style.zIndex = '1000'
  searchInput.style.padding = '5px'
  searchInput.style.backgroundColor = 'white'
  searchInput.style.border = '1px solid black'
  searchInput.style.borderRadius = '5px'
  searchInput.style.width = '200px'
  searchInput.style.boxShadow = '0px 0px 5px black'
  searchInput.style.fontSize = '1rem'
  searchInput.style.color = 'black'
  searchInput.style.textAlign = 'center'
  searchInput.style.fontFamily = 'Arial, sans-serif'
  searchInput.style.fontWeight = 'bold'
  searchInput.style.transition = 'all 0.3s ease'
  searchInput.style.outline = 'none'
  searchInput.style.cursor = 'pointer'
  searchInput.style.opacity = '0.8'
  searchInput.style.transition = 'opacity 0.3s ease'
  document.getElementById('map').appendChild(searchInput)

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase()
    if (searchTerm === '') {
      // If search term is empty, remove all markers
      for (const key in levelMarkers) {
        for (const subKey in levelMarkers[key]) {
          if (levelMarkers[key][subKey] instanceof L.LayerGroup) {
            levelMarkers[key][subKey].eachLayer((layer) => {
              if (layer instanceof L.Marker) {
                map.removeLayer(layer)
              }
            })
          }
        }
      }
      return
    }

    // Wait for user to stop typing for 500ms before performing search
    clearTimeout(performSearchFilter.timeout)
    performSearchFilter.timeout = setTimeout(() => {
      // Disable Search Input
      searchInput.disabled = true
      searchInput.style.opacity = '0.5'
      searchInput.style.cursor = 'not-allowed'

      performSearchFilter(searchTerm)

      // Enable Search Input
      searchInput.disabled = false
      searchInput.style.opacity = '0.8'
      searchInput.style.cursor = 'text'
    }, 500)
  })

  async function performSearchFilter(searchTerm) {
    // Get current layer
    const mapLayer = map.hasLayer(overworldLayers)
      ? 'Overworld'
      : map.hasLayer(underworldLayers)
        ? 'Underworld'
        : 'Sky'

    for (const key in levelMarkers) {
      if (key == mapLayer) {
        for (const subKey in levelMarkers[key]) {
          // Check if the levelMarkers[key][subKey] is a layer group
          if (levelMarkers[key][subKey] instanceof L.LayerGroup) {
            levelMarkers[key][subKey].remove()
            levelMarkers[key][subKey].eachLayer((layer) => {
              // Remove the layer from the map
              if (layer instanceof L.Marker) {
                const markerTitle = layer.options.title || ''
                if (markerTitle.toLowerCase().includes(searchTerm)) {
                  layer.addTo(map)
                  const layerMarker = layer._icon.children[0];

                  // Add yellow text shadow to the marker
                  layerMarker.style.textShadow = '0px 0px 16px yellow';
                  // layerMarker.style.transform = 'translate(-0.70rem, -1rem)';
                  layerMarker.style.transition = 'all 0.5s ease';
                  layerMarker.style.fontSize = '1.25rem';

                  // Wait for 0.3s before removing the text shadow
                  setTimeout(() => {
                    layerMarker.style.textShadow = '0px 0px 8px black';
                    layerMarker.style.fontSize = '1rem';
                    layerMarker.style.transform = 'translate(-0.35rem, -0.5rem)';
                  }, 200);



                 // map.setView(layer.getLatLng(), 2)
                } else {
                  map.removeLayer(layer)
                }
              }
            })
          }
        }
      }
    }
  }

  map.on('baselayerchange', (e) => {
    layerAdd(e, levelMarkers, layerControls)
    map.fitBounds(bounds)
  })

  layerAdd({ name: 'Overworld' }, levelMarkers, layerControls) // Initialize
  // Load Locations by default
  levelMarkers.Overworld.Locations.addTo(map)

  map.fitBounds(bounds)
})
</script>

<template>
  <main>
    <!-- Leaflet Map -->
    <div id="map"></div>

    <div class="joinUs">
      <a href="https://discord.gg/SszbKF5dtm" target="_blank">
        <button>Join us on <FontAwesomeIcon :icon="faDiscord" /></button>
      </a>
    </div>
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
.joinUs {
  position: fixed;
  right: 5px;
  bottom: 25px;
  z-index: 1000;
}

button {
  background-color: #222121;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}
button:hover {
  background-color: #444343;
}
button:active {
  background-color: #373737;
}
</style>
