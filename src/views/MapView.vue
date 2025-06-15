<script setup lang="ts">
const levelMarkers: Record<string, Record<string, any[]>> = {
  Overworld: {},
  Underworld: {},
  Sky: {},
}

import { ref, onMounted, watch, computed, reactive } from 'vue'
import locations from '@/assets/markerInformation/Locations.json'
import entitiesData from '@/assets/markerInformation/worldEntities.json'
import npcs from '@/assets/markerInformation/NPCs.json'
import npcDefinitions from '@/assets/markerInformation/NPCDefs.json'
import Map from 'ol/Map'
import View from 'ol/View'
import Overlay from 'ol/Overlay'
import Group from 'ol/layer/Group'
import ImageLayer from 'ol/layer/Image'
import ImageStatic from 'ol/source/ImageStatic'
import { fromLonLat } from 'ol/proj'

let map: Map
let overworldLayers: Group
let underworldLayers: Group
let skyLayers: Group

// Enhanced reactive state
const selectedLayer = ref('Overworld')
const isLoading = ref(true)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const allMarkersVisible = ref(true)
const currentZoom = ref(2)
const mouseCoords = reactive({ x: 0, y: 0 })
const isPanelExpanded = ref(false)

// Layer definitions with enhanced styling
const layers = ref([
  { 
    id: 'Overworld', 
    name: 'Overworld', 
    icon: '🌍', 
    color: '#F9F449',
    description: 'The main world layer'
  },
  { 
    id: 'Underworld', 
    name: 'Underworld', 
    icon: '🕳️', 
    color: '#e6e03a',
    description: 'Underground areas and caves'
  },
  { 
    id: 'Sky', 
    name: 'Sky', 
    icon: '☁️', 
    color: '#fbf65c',
    description: 'Floating islands and sky areas'
  }
])

// Marker categories for filtering
const markerCategories = ref([
  { name: 'Locations', icon: '📍', visible: true, count: 0 },
  { name: 'Trees', icon: '🌳', visible: true, count: 0 },
  { name: 'Obelisks', icon: '🗿', visible: true, count: 0 },
  { name: 'Ores', icon: '🪨', visible: true, count: 0 },
  { name: 'Banks', icon: '💰', visible: true, count: 0 },
  { name: 'Fires', icon: '🔥', visible: true, count: 0 },
  { name: 'Anvils', icon: '🔨', visible: true, count: 0 },
  { name: 'Furnaces', icon: '🏭', visible: true, count: 0 },
  { name: 'Kilns', icon: '⚱️', visible: true, count: 0 },
  { name: 'Stoves', icon: '🍳', visible: true, count: 0 },
  { name: 'Fishing Spots', icon: '🎣', visible: true, count: 0 },
  { name: 'Harvestables', icon: '🌾', visible: true, count: 0 },
  { name: 'Shops', icon: '🏪', visible: true, count: 0 },
  { name: 'NPCs', icon: '👤', visible: true, count: 0 },
  { name: 'Attackable NPCs', icon: '⚔️', visible: true, count: 0 },
  { name: 'Aggro NPCs', icon: '😈', visible: true, count: 0 }
])

// All searchable items
let searchableItems: any[] = []

// Enhanced methods
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  searchResults.value = searchableItems
    .filter(item => item.name.toLowerCase().includes(query))
    .slice(0, 10)
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
}

const goToLocation = (result: any) => {
  if (result.layer !== selectedLayer.value) {
    selectedLayer.value = result.layer
  }
  
  // Center map on the location
  setTimeout(() => {
    map?.getView().setCenter([result.x, result.y])
    map?.getView().setZoom(6)
  }, 100)
  
  // Clear search
  clearSearch()
}

const toggleAllMarkers = () => {
  allMarkersVisible.value = !allMarkersVisible.value
  markerCategories.value.forEach(category => {
    const wasVisible = category.visible
    category.visible = allMarkersVisible.value
    
    // Only call toggleMarkerCategory if the state actually changed
    if (wasVisible !== category.visible) {
      const currentLayerMarkers = levelMarkers[selectedLayer.value]
      if (currentLayerMarkers[category.name]) {
        currentLayerMarkers[category.name].forEach((marker: any) => {
          if (category.visible) {
            if (!map.getOverlays().getArray().includes(marker)) {
              map.addOverlay(marker)
            }
          } else {
            map.removeOverlay(marker)
          }
        })
      }
    }
  })
}

const toggleMarkerCategory = (categoryName: string) => {
  const category = markerCategories.value.find(cat => cat.name === categoryName)
  if (!category) return
  
  const currentLayerMarkers = levelMarkers[selectedLayer.value]
  if (currentLayerMarkers[categoryName]) {
    currentLayerMarkers[categoryName].forEach((marker: any) => {
      if (!category.visible) {
        if (!map.getOverlays().getArray().includes(marker)) {
          map.addOverlay(marker)
        }
      } else {
        map.removeOverlay(marker)
      }
    })
  }
}

const getCurrentLayerInfo = () => {
  return layers.value.find(layer => layer.id === selectedLayer.value) || layers.value[0]
}

const getVisibleMarkerCount = () => {
  return markerCategories.value
    .filter(cat => cat.visible)
    .reduce((sum, cat) => sum + cat.count, 0)
}

const zoomIn = () => {
  const view = map?.getView()
  if (view) {
    const currentZoom = view.getZoom() || 2
    view.setZoom(Math.min(currentZoom + 1, 8))
  }
}

const zoomOut = () => {
  const view = map?.getView()
  if (view) {
    const currentZoom = view.getZoom() || 2
    view.setZoom(Math.max(currentZoom - 1, 1))
  }
}

const resetView = () => {
  const view = map?.getView()
  if (view) {
    view.setCenter([512, 512])
    view.setZoom(2)
  }
}

const updateMarkerCounts = () => {
  markerCategories.value.forEach(category => {
    const currentLayerMarkers = levelMarkers[selectedLayer.value]
    category.count = currentLayerMarkers[category.name]?.length || 0
  })
}

const togglePanelExpansion = () => {
  isPanelExpanded.value = !isPanelExpanded.value
}

// Initialize searchable items
const initializeSearchableItems = () => {
  searchableItems = []
  
  // Add locations
  locations.locations.forEach((location: any) => {
    const layer = location.labelType === 0 ? 'Underworld' : 
                  location.labelType === 1 ? 'Overworld' : 'Sky'
    searchableItems.push({
      id: `location-${location.name}`,
      name: location.name,
      icon: '📍',
      layer,
      x: location.x + 512.5,
      y: location.y + 512.5,
      type: 'location'
    })
  })
  
  // Add NPCs
  npcs.npcs.forEach((npc: any) => {
    const npcDef = npcDefinitions.npcDefs.find((def: any) => npc.npcdef_id === def._id)
    if (npcDef?.name) {
      const layer = npc.mapLevel === 0 ? 'Underworld' : 
                    npc.mapLevel === 1 ? 'Overworld' : 'Sky'
      const name = typeof npcDef.name === 'string' ? 
        npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      
      searchableItems.push({
        id: `npc-${npc.x}-${npc.y}`,
        name,
        icon: npc.shopdef_id ? '🏪' : npc.isAlwaysAggroOverride ? '😈' : 
              npcDef.combat ? '⚔️' : '👤',
        layer,
        x: npc.x + 512.5,
        y: npc.y + 512.5,
        type: 'npc'
      })
    }
  })
}

onMounted(() => {
  // Initialize searchable items
  initializeSearchableItems()
  
  // Set bounds for a 1024x1024 map
  const bounds = [0, 0, 1024, 1024]
  const center = [512, 512]

  // Map initialization
  map = new Map({
    target: 'map',
    layers: [],
    controls: [], // Remove default OpenLayers controls
    view: new View({
      projection: 'EPSG:3857',
      center: center,
      zoom: 2,
      extent: bounds,
    }),
  })

  // Add mouse move listener for coordinates
  map.on('pointermove', (evt) => {
    const coordinate = evt.coordinate
    mouseCoords.x = Math.round(coordinate[0] - 512.5)
    mouseCoords.y = Math.round(coordinate[1] - 512.5)
  })

  // Add zoom change listener
  map.getView().on('change:resolution', () => {
    currentZoom.value = Math.round((map.getView().getZoom() || 2) * 10) / 10
  })

  // Layer groups for each level
  overworldLayers = new Group({
    layers: [
      new ImageLayer({
        source: new ImageStatic({
          url: '/mapImages/earthoverworldtexture.png',
          projection: 'EPSG:3857',
          imageExtent: bounds,
        }),
      }),
      new ImageLayer({
        source: new ImageStatic({
          url: '/mapImages/earthoverworldmap.png',
          projection: 'EPSG:3857',
          imageExtent: bounds,
        }),
      }),
    ],
  })
  underworldLayers = new Group({
    layers: [
      new ImageLayer({
        source: new ImageStatic({
          url: '/mapImages/earthundergroundtexture.png',
          projection: 'EPSG:3857',
          imageExtent: bounds,
        }),
      }),
      new ImageLayer({
        source: new ImageStatic({
          url: '/mapImages/earthundergroundmap.png',
          projection: 'EPSG:3857',
          imageExtent: bounds,
        }),
      }),
    ],
  })
  skyLayers = new Group({
    layers: [
      new ImageLayer({
        source: new ImageStatic({
          url: '/mapImages/earthskytexture.png',
          projection: 'EPSG:3857',
          imageExtent: bounds,
        }),
      }),
      new ImageLayer({
        source: new ImageStatic({
          url: '/mapImages/earthskymap.png',
          projection: 'EPSG:3857',
          imageExtent: bounds,
        }),
      }),
    ],
  })
  const baseMaps = {
    Sky: skyLayers,
    Overworld: overworldLayers,
    Underworld: underworldLayers,
  }

  // Overlay/marker management
  const treeMarkersSearch: Record<string, Record<string, Overlay[]>> = {
    Overworld: {},
    Underworld: {},
    Sky: {},
  }
  let searchMarkers: Overlay[] = []

  function addItem(marker: Overlay, level: string, group: string) {
    if (!levelMarkers[level][group]) levelMarkers[level][group] = []
    levelMarkers[level][group].push(marker)
    // Do NOT call map.addOverlay(marker) here
  }

  // Track the current base layer
  let currentBaseLayer: Group | null = null

  function setBaseLayer(newLayer: Group) {
    if (currentBaseLayer && map.getLayers().getArray().includes(currentBaseLayer)) {
      map.removeLayer(currentBaseLayer)
    }
    if (!map.getLayers().getArray().includes(newLayer)) {
      map.addLayer(newLayer)
    }
    currentBaseLayer = newLayer
    // Remove all overlays from all layers
    Object.values(levelMarkers).forEach(groups => {
      Object.values(groups).forEach(markers => {
        (markers as any[]).forEach(marker => map.removeOverlay(marker))
      })
    })
    // Add overlays for the selected layer only (respecting visibility filters)
    const layerName =
      newLayer === overworldLayers ? 'Overworld' :
      newLayer === underworldLayers ? 'Underworld' :
      'Sky'
    
    Object.entries(levelMarkers[layerName]).forEach(([categoryName, markers]) => {
      const category = markerCategories.value.find(cat => cat.name === categoryName)
      if (category?.visible) {
        (markers as any[]).forEach(marker => map.addOverlay(marker))
      }
    })
    
    // Update marker counts
    updateMarkerCounts()
  }

  // Add base layer
  setBaseLayer(overworldLayers)
  map.getView().fit(bounds)

  // Enhanced popup styling and functionality
  function attachMarkerPopup(marker: Overlay, content: string) {
    const el = marker.getElement()
    if (el) {
      el.style.cursor = 'pointer'
      el.classList.add('map-marker')
      el.style.transition = 'all 0.2s ease'
      el.style.position = 'relative'
      el.style.zIndex = '999'
      
      el.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        showPopup(content, marker.getPosition() as [number, number])
      })
      
      // Add hover effects with proper positioning
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'translate(-50%, -50%) scale(1.2)'
        el.style.zIndex = '1000'
        el.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(-50%, -50%) scale(1)'
        el.style.zIndex = '999'
        el.style.filter = 'none'
      })
    }
  }

  // Add location overlays
  locations.locations.forEach((location: any) => {
    const marker = new Overlay({
      position: [location.x + 512.5, location.y + 512.5],
      element: document.createElement('div'),
      
    })
    const el = marker.getElement()
    if (el) {
      el.className = 'text-label'
      el.innerHTML = `<div class="text-label" style="position:absolute;left:50%;top:50%;transform:translate(-50%, -50%);">${location.name}</div>`
      attachMarkerPopup(marker, location.name)
    }
    switch (location.labelType) {
      case 0:
        addItem(marker, 'Underworld', 'Locations')
        break
      case 1:
        addItem(marker, 'Overworld', 'Locations')
        break
      case 2:
        addItem(marker, 'Sky', 'Locations')
        break
    }
  })

  // Add entity overlays (trees, obelisks, etc.)
  const worldEntities = (entitiesData as any).worldEntities || []
  worldEntities.forEach((entity: any) => {
    if (
      (entity.type.includes('tree') || entity.type.includes('cherryblossom')) &&
      entity.type != 'treestump'
    ) {
      let name = entity.type.replace('tree', ' Tree')
      name = name.replace('blossom', ' Blossom')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        el.className = 'text-label'
        el.innerHTML = `<div class="marker" style="position:absolute;left:50%;top:50%;transform:translate(-50%, -50%);">🌳</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Obelisk is Unicode: 🗿
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🗿</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Rocks is Unicode: 🪨
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🪨</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Bank is Unicode: 💰
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">💰</div>`
        el.title = nameWithSpaces
        attachMarkerPopup(marker, nameWithSpaces)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Fire is Unicode: 🔥
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🔥</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Anvil is Unicode: 🔨
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🔨</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Smelting is Unicode: 🏭
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🏭</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Kiln is Unicode: ⚱️
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">⚱️</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Heat Source is Unicode: 🍳
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🍳</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Fishing is Unicode: 🎣
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🎣</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Pumpkin is Unicode: 🎃
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🎃</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Corn is Unicode: 🌽
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🌽</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

      switch (entity.lvl) {
        case 1:
          addItem(marker, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(marker, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(marker, 'Sky', 'Harvestables');
          break
      }
    }

    if (entity.type.includes('potatoes')) {
      const name = entity.type.replace('potatoes', ' Potatoes')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Potatoes is Unicode: 🥔
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🥔</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Onion is Unicode: 🧅
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🧅</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Flax is Unicode: 🌾
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🌾</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Carrot is Unicode: 🥕
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🥕</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Red Mushroom is Unicode: 🍄
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🍄</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Plant is Unicode: 🌱
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🌱</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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
      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Strawberries is Unicode: 🍓
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🍓</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

      const marker = new Overlay({
        position: [entity.x + 512.5, entity.z + 512.5],
        element: document.createElement('div'),
        
      })
      const el = marker.getElement()
      if (el) {
        // Icon for Watermelon is Unicode: 🍉
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🍉</div>`
        el.title = nameWithSpacesCapitalized
        attachMarkerPopup(marker, nameWithSpacesCapitalized)
      }

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

  // Popup overlay setup (after map is initialized)
  const popupElement = document.createElement('div')
  popupElement.className = 'ol-popup'
  let popupContent = ''
  popupElement.innerHTML = ''
  const popupOverlay = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    stopEvent: true,
    offset: [0, -25],
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  })
  map.addOverlay(popupOverlay)

  function showPopup(content: string, position: [number, number]) {
    popupContent = content
    
    // Calculate display coordinates (relative to map center)
    const displayX = Math.round(position[0] - 512.5)
    const displayY = Math.round(position[1] - 512.5)
    
    // Create wiki URL from content
    const wikiName = content.replace(/\s+/g, '_').replace(/[()]/g, '').replace(/Lvl\._\d+/g, '').trim()
    const wikiUrl = `https://highspell.wiki/w/${wikiName}`
    
    popupElement.innerHTML = `
      <div class="popup-content">
        <div class="popup-info">
          <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="popup-link">
            ${content}
          </a>
          <div class="popup-coords">
            X: ${displayX}, Y: ${displayY}
          </div>
        </div>
        <button class="popup-close" type="button">&times;</button>
      </div>
    `
    popupOverlay.setPosition(position)
    popupElement.style.display = 'block'
    popupElement.style.opacity = '0'
    popupElement.style.transform = 'translate(-50%, -100%) translateY(10px) scale(0.9)'
    
    // Animate popup appearance
    requestAnimationFrame(() => {
      popupElement.style.transition = 'all 0.2s ease-out'
      popupElement.style.opacity = '1'
      popupElement.style.transform = 'translate(-50%, -100%) translateY(0) scale(1)'
    })
    
    const closeBtn = popupElement.querySelector('.popup-close') as HTMLElement | null
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation()
        hidePopup()
      }
    }
  }
  function hidePopup() {
    if (popupElement.style.display !== 'none') {
      popupElement.style.transition = 'all 0.15s ease-in'
      popupElement.style.opacity = '0'
      popupElement.style.transform = 'translate(-50%, -100%) translateY(-10px) scale(0.9)'
      
      setTimeout(() => {
        popupOverlay.setPosition(undefined)
        popupElement.style.display = 'none'
      }, 150)
    }
  }
  map.on('click', function (evt: any) {
    if (evt.originalEvent.target === map.getTargetElement()) {
      hidePopup()
    }
  })

  npcs.npcs.forEach((npc: any) => {
    const npcDef = npcDefinitions.npcDefs.find((def: any) => npc.npcdef_id === def._id) as any
    if (!npcDef) return

    // Find the item in the npcDefinitions.npcDefs JSON array where npc._id == npcDef._id
    // const npcDef = npcDefinitions.npcDefs.find((npcDef) => npc.npcdef_id === npcDef._id)

    // Check if NPC has a value for "shopdef_id"
    if (npc.shopdef_id) {
      // Capitalize characters after spaces
      const name = typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      const marker = new Overlay({
        position: [npc.x + 512.5, npc.y + 512.5],
        element: document.createElement('div'),
      })
      const el = marker.getElement()
      if (el) {
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">🏪</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
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
      return
    }

    if (npc.isAlwaysAggroOverride) {
      // Capitalize characters after spaces
      const name =
        (typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : '') +
        (npcDef.combat && npcDef.combat.level ? ' (Lvl. ' + npcDef.combat.level + ')' : '')
      const marker = new Overlay({
        position: [npc.x + 512.5, npc.y + 512.5],
        element: document.createElement('div'),
      })
      const el = marker.getElement()
      if (el) {
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">😈</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
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
      return
    }

    // Check if npcDef has a definition for "combat"
    if (!npcDef) {
      // Add Regular NPC
      // Capitalize characters after spaces
      const name = typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      const marker = new Overlay({
        position: [npc.x + 512.5, npc.y + 512.5],
        element: document.createElement('div'),
      })
      const el = marker.getElement()
      if (el) {
        // Icon for NPC is Unicode: 👤
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">👤</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
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
      const name = typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      const marker = new Overlay({
        position: [npc.x + 512.5, npc.y + 512.5],
        element: document.createElement('div'),
      })
      const el = marker.getElement()
      if (el) {
        // Icon for NPC is Unicode: 👤
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">👤</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
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
      const name =
        (typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : '') +
        (npcDef.combat.level ? ' (Lvl. ' + npcDef.combat.level + ')' : '')
      const marker = new Overlay({
        position: [npc.x + 512.5, npc.y + 512.5],
        element: document.createElement('div'),
      })
      const el = marker.getElement()
      if (el) {
        el.className = 'text-label'
        el.innerHTML = `<div class="marker">⚔️</div>`
        el.title = name
        attachMarkerPopup(marker, name)
      }

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
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
      return
    }
  })

  // Animate marker movement (for player position)
  function animateMarker(marker: Overlay, toLonLat: [number, number], duration = 1000) {
    const from = marker.getPosition()
    const to = fromLonLat(toLonLat)
    const startTime = performance.now()
    function animate(time: number) {
      const elapsed = time - startTime
      const t = Math.min(elapsed / duration, 1)
      const newPos = [
        (from![0] as number) + ((to[0] as number) - (from![0] as number)) * t,
        (from![1] as number) + ((to[1] as number) - (from![1] as number)) * t,
      ]
      marker.setPosition(newPos)
      if (t < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }

  // Handle URL params for initial view/marker
  const urlParams = new URLSearchParams(window.location.search)
  const level = urlParams.get('lvl')
  const posX = urlParams.get('pos_x')
  const posY = urlParams.get('pos_y')
  const hideDecor = urlParams.get('hide_decor')
  let playPositionMarker: Overlay | null = null
  if (posX && posY) {
    map.getView().setCenter(fromLonLat([+posX, +posY]))
    playPositionMarker = new Overlay({
      position: fromLonLat([+posX, +posY]),
      element: document.createElement('div'),
      
    })
  }

  // Fix playPositionMarker.getElement() possibly undefined
  if (playPositionMarker && playPositionMarker.getElement()) {
    playPositionMarker.getElement()!.className = 'text-label'
    playPositionMarker.getElement()!.innerHTML = `<div class="marker playerPosition" style="font-size:1.5rem;color:white;text-shadow: 0px 0px 8px black;">❌</div>`
    playPositionMarker.getElement()!.title = 'You are here'
    map.addOverlay(playPositionMarker)
  }

  // --- Move setBaseLayer and onLayerChange inside onMounted ---
  // Removed duplicate: function setBaseLayer(newLayer: Group) { ... }

  // Watch for layer changes and update base layer
  watch(selectedLayer, (newVal) => {
    setBaseLayer(
      newVal === 'Overworld' ? overworldLayers :
      newVal === 'Underworld' ? underworldLayers :
      skyLayers
    )
  })

  // Set initial layer based on URL param
  if (level) {
    switch (level) {
      case 'Overworld':
        setBaseLayer(overworldLayers)
        break
      case 'Underworld':
        setBaseLayer(underworldLayers)
        break
      case 'Sky':
        setBaseLayer(skyLayers)
        break
    }
  } else {
    setBaseLayer(overworldLayers)
  }

  window.addEventListener('message', (event: any) => {
    if (event.data.X && event.data.Y && event.data.lvl) {
      switch (event.data.lvl) {
        case 'Overworld':
          setBaseLayer(overworldLayers)
          break
        case 'Underworld':
          setBaseLayer(underworldLayers)
          break
        case 'Sky':
          setBaseLayer(skyLayers)
          break
      }
      if (playPositionMarker) {
        animateMarker(playPositionMarker, [event.data.X, event.data.Y])
      }
    }
  })

  if (hideDecor) {
    const footer = document.querySelector('.footer') as HTMLElement | null
    const header = document.querySelector('header') as HTMLElement | null
    const joinUs = document.querySelector('.joinUs') as HTMLElement | null
    if (footer) footer.style.display = 'none'
    if (header) header.style.display = 'none'
    if (joinUs) joinUs.style.display = 'none'
    const main = document.querySelector('main') as HTMLElement | null
    if (main) main.style.height = '100vh'
  }

  // Initialize marker counts
  updateMarkerCounts()
  
  // Set loading to false after everything is initialized
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})
</script>

<template>
  <main>
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading map...</p>
      </div>
    </div>

    <div id="map">
      <!-- Enhanced Layer Controls -->
      <div class="map-controls-container">
        <!-- Unified Control Panel -->
        <div class="control-panel unified-controls">
          <!-- Search Section (Always Visible) -->
          <div class="control-section search-section">
            <div class="search-input-container">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search locations, NPCs..."
                class="search-input"
                @input="handleSearch"
              />
              <button v-if="searchQuery" @click="clearSearch" class="clear-search">×</button>
            </div>
            <div v-if="searchResults.length > 0" class="search-results">
              <div 
                v-for="result in searchResults.slice(0, 6)" 
                :key="result.id"
                @click="goToLocation(result)"
                class="search-result-item"
              >
                <span class="result-icon">{{ result.icon }}</span>
                <span class="result-name">{{ result.name }}</span>
                <span class="result-layer">{{ result.layer }}</span>
              </div>
            </div>
          </div>

          <!-- Layer Selection Section (Always Visible) -->
          <div class="control-section">
            <div class="section-header">
              <h3 class="section-title">Map Layers</h3>
            </div>
            <div class="layer-buttons">
              <button 
                v-for="layer in layers" 
                :key="layer.id"
                @click="selectedLayer = layer.id"
                :class="['layer-btn', { active: selectedLayer === layer.id }]"
              >
                {{ layer.name }}
              </button>
            </div>
            
            <!-- Expand/Collapse Button -->
            <div class="panel-toggle-container">
              <button @click="togglePanelExpansion" class="panel-toggle-btn">
                <span class="toggle-icon">{{ isPanelExpanded ? '−' : '+' }}</span>
                <span class="toggle-text">{{ isPanelExpanded ? 'Hide Filters' : 'Show Filters' }}</span>
              </button>
            </div>
          </div>

          <!-- Advanced Options (Collapsible) -->
          <div v-if="isPanelExpanded" class="advanced-options">
            <!-- Filters Section -->
            <div class="control-section">
              <div class="section-header">
                <h3 class="section-title">Filters</h3>
                <button @click="toggleAllMarkers" class="toggle-all-btn">
                  {{ allMarkersVisible ? 'Hide All' : 'Show All' }}
                </button>
              </div>
              <div class="filter-tags">
                <button 
                  v-for="category in markerCategories" 
                  :key="category.name"
                  @click="toggleMarkerCategory(category.name); category.visible = !category.visible"
                  :class="['filter-tag', { active: category.visible }]"
                >
                  {{ category.name }} ({{ category.count }})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <button @click="zoomIn" class="zoom-btn zoom-in" title="Zoom In">+</button>
        <button @click="zoomOut" class="zoom-btn zoom-out" title="Zoom Out">−</button>
        <button @click="resetView" class="zoom-btn reset-view" title="Reset View">🏠</button>
      </div>

      <!-- Coordinates Display -->
      <div class="coordinates-display">
        <span class="coord-label">X:</span>
        <span class="coord-value">{{ mouseCoords.x }}</span>
        <span class="coord-label">Y:</span>
        <span class="coord-value">{{ mouseCoords.y }}</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Using consistent website theme colors */

/* Main layout */
main {
  text-align: center;
  height: calc(100vh - 75px);
  position: relative;
}

#map {
  height: 100%;
  width: 100%;
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, var(--theme-background) 0%, var(--theme-background-soft) 100%);
}

/* Loading overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  text-align: center;
  color: var(--theme-text-primary);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--theme-accent-transparent-30);
  border-top: 4px solid var(--theme-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Enhanced controls container */
.map-controls-container {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 360px;
  max-height: calc(100vh - 120px);
  z-index: 1001;
}

/* Unified control panel */
.unified-controls {
  background: rgba(26, 26, 26, 0.96);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--theme-border);
  overflow: hidden;
  transition: all 0.3s ease;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

/* Control sections */
.control-section {
  border-bottom: 1px solid var(--theme-border-light);
  padding: 0;
}

.control-section:last-child {
  border-bottom: none;
}

.section-header {
  padding: 12px 20px 6px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--theme-accent);
  position: sticky;
  top: 0;
  z-index: 10;
}

.section-icon {
  font-size: 18px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  color: var(--theme-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-content {
  padding: 16px;
}

/* Layer controls */
.layer-buttons {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 12px 20px 20px 20px;
}

.layer-btn {
  padding: 12px 18px;
  border: 2px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text-primary);
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 1;
  white-space: nowrap;
}

.layer-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-transparent-10);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.layer-btn.active {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: var(--theme-text-dark);
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Search panel */
.search-section {
  border-bottom: 1px solid var(--theme-border);
}

.search-input-container {
  position: relative;
  margin-bottom: 8px;
  padding: 12px 20px 0 20px;
}

.search-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid var(--theme-border);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: var(--theme-background-mute);
  color: var(--theme-text-primary);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-accent-transparent-10), inset 0 2px 4px rgba(0, 0, 0, 0.1);
  background: var(--theme-background-soft);
}

.search-input::placeholder {
  color: var(--theme-text-muted);
}

.clear-search {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  color: var(--theme-text-muted);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  margin-top: 8px;
}

.clear-search:hover {
  color: var(--theme-accent);
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
  padding: 0 20px 16px;
}

/* Panel Toggle Button */
.panel-toggle-container {
  padding: 8px 20px 16px;
  border-top: 1px solid var(--theme-border-light);
  margin-top: 8px;
}

.panel-toggle-btn {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.panel-toggle-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-transparent-10);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.toggle-icon {
  font-size: 16px;
  font-weight: bold;
  color: var(--theme-accent);
}

.toggle-text {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Advanced Options Container */
.advanced-options {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--theme-border-light);
  color: var(--theme-text-primary);
  border-radius: 8px;
  margin-bottom: 6px;
  background: var(--theme-background-mute);
}

.search-result-item:hover {
  background: var(--theme-accent-transparent-10);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-result-item:hover {
  background: var(--theme-accent-transparent-10);
  transform: translateX(4px);
}

.search-result-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.result-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.result-name {
  flex: 1;
  font-weight: 500;
  color: var(--theme-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-layer {
  font-size: 11px;
  color: var(--theme-text-dark);
  background: var(--theme-accent-transparent-60);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

/* Markers section */
.toggle-all-btn {
  padding: 8px 16px;
  font-size: 12px;
  background: var(--theme-accent);
  border: none;
  border-radius: 8px;
  color: var(--theme-text-dark);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 700;
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.toggle-all-btn:hover {
  background: var(--theme-accent-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Filter controls */
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px 20px 20px;
}

.filter-tag {
  padding: 8px 14px;
  border: 2px solid var(--theme-border);
  border-radius: 24px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-text-muted);
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-tag:hover {
  border-color: var(--theme-accent-transparent-40);
  background: var(--theme-accent-transparent-10);
  color: var(--theme-text-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.filter-tag.active {
  border-color: var(--theme-accent-transparent-40);
  background: var(--theme-accent-transparent-10);
  color: var(--theme-text-primary);
  font-weight: 600;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
}

/* Custom scrollbars for the unified panel */
.unified-controls::-webkit-scrollbar,
.search-results::-webkit-scrollbar {
  width: 6px;
}

.unified-controls::-webkit-scrollbar-track,
.search-results::-webkit-scrollbar-track {
  background: var(--theme-accent-transparent-10);
  border-radius: 3px;
}

.unified-controls::-webkit-scrollbar-thumb,
.search-results::-webkit-scrollbar-thumb {
  background: var(--theme-accent-transparent-40);
  border-radius: 3px;
}

.unified-controls::-webkit-scrollbar-thumb:hover,
.search-results::-webkit-scrollbar-thumb:hover {
  background: var(--theme-accent-transparent-60);
}

/* Responsive design */
@media (max-width: 768px) {
  .map-controls-container {
    width: 320px;
    right: 8px;
    top: 8px;
  }
  
  .zoom-controls {
    left: 8px;
    top: 8px;
  }
  
  .coordinates-display {
    left: 8px;
    bottom: 8px;
    font-size: 11px;
  }
}
/* Zoom controls */
.zoom-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1001;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  background: rgba(26, 26, 26, 0.9);
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  color: var(--theme-text-primary);
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
}

.zoom-btn:hover {
  background: var(--theme-background-soft);
  border-color: var(--theme-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--theme-accent-transparent-20);
}

.zoom-btn:active {
  transform: translateY(0);
}

/* Coordinates display */
.coordinates-display {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(26, 26, 26, 0.9);
  color: var(--theme-text-primary);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 1001;
  backdrop-filter: blur(4px);
  border: 1px solid var(--theme-border);
}

.coord-label {
  margin-right: 4px;
  color: var(--theme-accent-muted);
}

.coord-value {
  margin-right: 12px;
  font-weight: bold;
  color: var(--theme-accent-light);
}

/* Map markers */
:global(.map-marker) {
  transition: all 0.2s ease !important;
  position: relative !important;
  z-index: 999 !important;
  pointer-events: auto !important;
}

:global(.map-marker:hover) {
  z-index: 1000 !important;
}

:global(.marker) {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 1em !important;
  line-height: 1 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
  user-select: none !important;
}

:global(.text-label) {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  pointer-events: auto !important;
  user-select: none !important;
}

/* Enhanced popup styles */
:global(.ol-popup) {
  position: absolute;
  background: var(--theme-background-soft);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 0;
  min-width: 200px;
  max-width: 300px;
  font-size: 14px;
  pointer-events: auto;
  z-index: 2000;
  border: 1px solid var(--theme-border);
  backdrop-filter: blur(10px);
  overflow: visible;
  margin-bottom: 12px;
}

:global(.ol-popup::after) {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 12px solid var(--theme-background-soft);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:global(.ol-popup::before) {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 13px solid transparent;
  border-right: 13px solid transparent;
  border-top: 13px solid var(--theme-border);
  z-index: -1;
}

:global(.popup-content) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--theme-background-soft);
  color: var(--theme-text-primary);
  border-radius: 12px;
  min-height: 24px;
  white-space: nowrap;
}

:global(.popup-info) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

:global(.popup-link) {
  color: var(--theme-accent-dark);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

:global(.popup-link:hover) {
  color: var(--theme-accent);
  text-decoration: underline;
}

:global(.popup-coords) {
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
}

:global(.popup-text) {
  color: var(--theme-text-primary);
  font-weight: 600;
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
}

:global(.popup-close) {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--theme-text-muted);
  cursor: pointer;
  padding: 2px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-weight: normal;
  line-height: 1;
}

:global(.popup-close:hover) {
  background: var(--theme-accent-transparent-10);
  color: var(--theme-accent);
  transform: scale(1.1);
}

/* Responsive design */
@media (max-width: 768px) {
  .map-controls-container {
    width: 320px;
    right: 8px;
    top: 8px;
  }
  
  .zoom-controls {
    left: 8px;
    top: 8px;
  }
  
  .coordinates-display {
    left: 8px;
    bottom: 8px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .map-controls-container {
    width: 280px;
  }
  
  .control-panel {
    font-size: 13px;
  }
  
  .layer-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .zoom-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .filter-tag {
    font-size: 11px;
    padding: 5px 10px;
  }
}
  
  .category-name {
    color: var(--white);
  }
  
  .search-result-item {
    color: var(--white);
  }
  
  .result-name {
    color: var(--white);
  }
  
  /* Dark theme popup styles */
  :global(.ol-popup) {
    background: var(--dark-grey) !important;
    border-color: rgba(245, 158, 11, 0.3) !important;
  }
  
  :global(.ol-popup::after) {
    border-top-color: var(--dark-grey) !important;
  }
  
  :global(.ol-popup::before) {
    border-top-color: rgba(245, 158, 11, 0.3) !important;
  }
  
  :global(.popup-content) {
    background: var(--dark-grey) !important;
    color: var(--white) !important;
  }
  
  :global(.popup-link) {
    color: var(--map-primary-light) !important;
  }

/* Animation classes */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
</style>
