<script setup lang="ts">
const levelMarkers: Record<string, Record<string, Feature[]>> = {
  Overworld: {},
  Underworld: {},
  Sky: {},
}

// Vector layers for markers
const markerLayers: Record<string, VectorLayer<VectorSource>> = {
  Overworld: new VectorLayer({ source: new VectorSource() }),
  Underworld: new VectorLayer({ source: new VectorSource() }),
  Sky: new VectorLayer({ source: new VectorSource() })
}

// Separate layers for location labels to ensure they're always on top
const locationLabelLayers: Record<string, VectorLayer<VectorSource>> = {
  Overworld: new VectorLayer({ 
    source: new VectorSource(),
    zIndex: 1000 // High z-index to ensure labels are on top
  }),
  Underworld: new VectorLayer({ 
    source: new VectorSource(),
    zIndex: 1000
  }),
  Sky: new VectorLayer({ 
    source: new VectorSource(),
    zIndex: 1000
  })
}

import { ref, onMounted, onUnmounted, watch, computed, reactive } from 'vue'
import locations from '@/assets/markerInformation/Locations.json'
import entitiesData from '@/assets/markerInformation/worldEntities.json'
import npcs from '@/assets/markerInformation/NPCs.json'
import npcDefinitions from '@/assets/markerInformation/NPCDefs.json'
import Map from 'ol/Map'
import View from 'ol/View'
import Overlay from 'ol/Overlay'
import Group from 'ol/layer/Group'
import ImageLayer from 'ol/layer/Image'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import ImageStatic from 'ol/source/ImageStatic'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { Style, Text, Fill, Stroke, Icon } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultInteractions } from 'ol/interaction'

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
const mouseCoords = reactive({ x: 0, y: 0 })
const isPanelExpanded = ref(false)

// Performance optimization variables
let hoverTimeout: number | null = null

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

// Enhanced search with better filtering and result grouping
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  const results = searchableItems
    .filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query)
      const typeMatch = item.type?.toLowerCase().includes(query)
      const layerMatch = item.layer.toLowerCase().includes(query)
      return nameMatch || typeMatch || layerMatch
    })
    .map(item => ({
      ...item,
      // Calculate relevance score for better sorting
      relevance: calculateRelevance(item, query)
    }))
    .sort((a, b) => {
      // Sort by relevance first, then by type priority, then alphabetically
      if (b.relevance !== a.relevance) return b.relevance - a.relevance
      
      const typePriority = { location: 3, shop: 2, npc: 1, resource: 0 }
      const aPriority = typePriority[a.type as keyof typeof typePriority] || 0
      const bPriority = typePriority[b.type as keyof typeof typePriority] || 0
      
      if (bPriority !== aPriority) return bPriority - aPriority
      return a.name.localeCompare(b.name)
    })
    .slice(0, 12) // Show more results
  
  searchResults.value = results
}

const calculateRelevance = (item: any, query: string): number => {
  const name = item.name.toLowerCase()
  let score = 0
  
  // Exact match gets highest score
  if (name === query) score += 100
  // Start of name match gets high score
  else if (name.startsWith(query)) score += 80
  // Word boundary match gets medium score  
  else if (name.includes(' ' + query)) score += 60
  // Contains match gets base score
  else if (name.includes(query)) score += 40
  
  // Boost important types
  if (item.type === 'location') score += 20
  if (item.type === 'shop') score += 15
  if (item.type === 'npc') score += 10
  
  // Boost current layer
  if (item.layer === selectedLayer.value) score += 10
  
  return score
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
        // Handle locations separately (they use location label layers)
        if (category.name === 'Locations') {
          const layer = locationLabelLayers[selectedLayer.value]
          const source = layer.getSource()
          if (source) {
            currentLayerMarkers[category.name].forEach((feature: Feature) => {
              if (category.visible) {
                if (!source.hasFeature(feature)) {
                  source.addFeature(feature)
                }
              } else {
                source.removeFeature(feature)
              }
            })
          }
        } else {
          // Handle other markers (they use regular marker layers)
          const layer = markerLayers[selectedLayer.value]
          const source = layer.getSource()
          if (source) {
            currentLayerMarkers[category.name].forEach((feature: Feature) => {
              if (category.visible) {
                if (!source.hasFeature(feature)) {
                  source.addFeature(feature)
                }
              } else {
                source.removeFeature(feature)
              }
            })
          }
        }
      }
    }
  })
}

const toggleMarkerCategory = (categoryName: string) => {
  const category = markerCategories.value.find(cat => cat.name === categoryName)
  if (!category) return
  
  const currentLayerMarkers = levelMarkers[selectedLayer.value]
  if (currentLayerMarkers[categoryName]) {
    // Handle locations separately (they use location label layers)
    if (categoryName === 'Locations') {
      const layer = locationLabelLayers[selectedLayer.value]
      const source = layer.getSource()
      if (source) {
        currentLayerMarkers[categoryName].forEach((feature: Feature) => {
          if (!category.visible) {
            if (!source.hasFeature(feature)) {
              source.addFeature(feature)
            }
          } else {
            source.removeFeature(feature)
          }
        })
      }
    } else {
      // Handle other markers (they use regular marker layers)
      const layer = markerLayers[selectedLayer.value]
      const source = layer.getSource()
      if (source) {
        currentLayerMarkers[categoryName].forEach((feature: Feature) => {
          if (!category.visible) {
            if (!source.hasFeature(feature)) {
              source.addFeature(feature)
            }
          } else {
            source.removeFeature(feature)
          }
        })
      }
    }
  }
}

const getCurrentLayerInfo = () => {
  return layers.value.find(layer => layer.id === selectedLayer.value) || layers.value[0]
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
  // Extended bounds to allow comfortable zoom-out
  const extendedBounds = [-512, -512, 1536, 1536]

  // Map initialization
  map = new Map({
    target: 'map',
    layers: [],
    controls: [], // Remove default OpenLayers controls
    interactions: defaultInteractions(),
    view: new View({
      projection: 'EPSG:3857',
      center: center,
      zoom: 2,
      minZoom: 0, // Allow zooming out more
      maxZoom: 28, // Set a reasonable max zoom
      extent: extendedBounds, // Use extended bounds for more comfortable navigation
      constrainResolution: false // Allow smoother zooming
    }),
  })

  // Enhanced mouse interaction with throttled hover detection to reduce canvas reads
  map.on('pointermove', (evt) => {
    const coordinate = evt.coordinate
    mouseCoords.x = Math.round(coordinate[0] - 512.5)
    mouseCoords.y = Math.round(coordinate[1] - 512.5)
    
    // Throttle hover detection to reduce canvas readback operations
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    
    hoverTimeout = setTimeout(() => {
      // Enhanced hover effects for all marker types
      const features = map.getFeaturesAtPixel(evt.pixel)
      
      // Reset all features to default style first
      Object.values(locationLabelLayers).forEach(layer => {
        layer.getSource()?.getFeatures().forEach(feature => {
          if (feature.get('isLocation')) {
            const defaultStyle = feature.get('defaultStyle')
            if (defaultStyle) {
              feature.setStyle(defaultStyle)
            }
          }
        })
      })
      
      Object.values(markerLayers).forEach(layer => {
        layer.getSource()?.getFeatures().forEach(feature => {
          if (!feature.get('isLocation')) {
            const defaultStyle = feature.get('defaultStyle')
            if (defaultStyle) {
              feature.setStyle(defaultStyle)
            }
          }
        })
      })
      
      // Apply hover effects to features under cursor
      if (features.length > 0) {
        const hoveredFeatures = features.slice(0, 3) // Limit to top 3 features to avoid performance issues
        
        hoveredFeatures.forEach(featureLike => {
          // Check if it's an actual Feature (not RenderFeature)
          if ('setStyle' in featureLike && 'get' in featureLike) {
            const feature = featureLike as Feature
            const hoverStyle = feature.get('hoverStyle')
            if (hoverStyle) {
              feature.setStyle(hoverStyle)
            }
          }
        })
        
        map.getViewport().style.cursor = 'pointer'
        
        // Show tooltip for multiple features if clustered
        if (features.length > 1) {
          const featureNames = features.slice(0, 5)
            .filter(f => 'get' in f)
            .map(f => (f as Feature).get('name'))
            .filter(name => name)
          if (featureNames.length > 1) {
            map.getViewport().title = `Multiple items: ${featureNames.join(', ')}`
          }
        } else if ('get' in features[0]) {
          map.getViewport().title = (features[0] as Feature).get('name') || ''
        }
      } else {
        map.getViewport().style.cursor = 'default'
        map.getViewport().title = ''
      }
    }, 16) // ~60fps throttling to reduce canvas reads
  })


  // Add feature click handling
  map.on('singleclick', function (evt) {
    const features = map.getFeaturesAtPixel(evt.pixel)
    if (features.length > 0) {
      const feature = features[0]
      const name = feature.get('name')
      if (name) {
        const geometry = feature.getGeometry()
        if (geometry && geometry.getType() === 'Point') {
          const coordinates = (geometry as Point).getCoordinates()
          showPopup(name, coordinates as [number, number])
        }
      }
    } else {
      // Click on empty area - hide popup
      hidePopup()
    }
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

  function addItem(feature: Feature, level: string, group: string) {
    if (!levelMarkers[level][group]) levelMarkers[level][group] = []
    levelMarkers[level][group].push(feature)
    
    // Add feature to the appropriate vector layer
    const layer = markerLayers[level]
    if (layer) {
      layer.getSource()?.addFeature(feature)
    }
  }

  function addLocationItem(feature: Feature, level: string, group: string) {
    if (!levelMarkers[level][group]) levelMarkers[level][group] = []
    levelMarkers[level][group].push(feature)
    
    // Add feature to the location label layer (always on top)
    const layer = locationLabelLayers[level]
    if (layer) {
      layer.getSource()?.addFeature(feature)
    }
  }

  // Enhanced marker creation with better styling and categorization
  function createMarkerFeature(position: [number, number], icon: string, name: string, category?: string): Feature {
    const feature = new Feature({
      geometry: new Point(position),
      name: name,
      icon: icon,
      category: category || 'unknown'
    })
    
    // Define category-based styling for better contrast and UX
    const categoryStyles = {
      'Banks': { color: '#ffd700', strokeColor: '#b8860b', fontSize: '1rem', priority: 'high' },
      'Shops': { color: '#00ff7f', strokeColor: '#008b4b', fontSize: '1rem', priority: 'high' },
      'NPCs': { color: '#87ceeb', strokeColor: '#4682b4', fontSize: '1rem', priority: 'medium' },
      'Attackable NPCs': { color: '#ff6347', strokeColor: '#cd4a38', fontSize: '1rem', priority: 'high' },
      'Aggro NPCs': { color: '#ff1493', strokeColor: '#8b0040', fontSize: '1rem', priority: 'high' },
      'Trees': { color: '#90ee90', strokeColor: '#228b22', fontSize: '1rem', priority: 'low' },
      'Obelisks': { color: '#dda0dd', strokeColor: '#9370db', fontSize: '1rem', priority: 'medium' },
      'Ores': { color: '#d2691e', strokeColor: '#8b4513', fontSize: '1rem', priority: 'low' },
      'Fires': { color: '#ff4500', strokeColor: '#cc3700', fontSize: '1rem', priority: 'low' },
      'Anvils': { color: '#c0c0c0', strokeColor: '#696969', fontSize: '1rem', priority: 'medium' },
      'Furnaces': { color: '#ff8c00', strokeColor: '#cc7000', fontSize: '1rem', priority: 'medium' },
      'Kilns': { color: '#cd853f', strokeColor: '#8b5a2b', fontSize: '1rem', priority: 'low' },
      'Stoves': { color: '#ffa500', strokeColor: '#cc8400', fontSize: '1rem', priority: 'low' },
      'Fishing Spots': { color: '#00bfff', strokeColor: '#0080cc', fontSize: '1rem', priority: 'low' },
      'Harvestables': { color: '#adff2f', strokeColor: '#7acc00', fontSize: '1rem', priority: 'low' },
      'Locations': { color: '#ffffff', strokeColor: '#1a1a1a', fontSize: '1rem', priority: 'highest' }
    }
    
    const style = categoryStyles[category as keyof typeof categoryStyles] || 
                  { color: '#ffffff', strokeColor: '#000000', fontSize: '1rem', priority: 'low' }
    
    const strokeWidth = style.priority === 'highest' ? 3 : 
                       style.priority === 'high' ? 2.5 : 
                       style.priority === 'medium' ? 2 : 1.5
    
    // Create default style with category-specific colors
    const defaultStyle = new Style({
      text: new Text({
        text: icon,
        font: `bold ${style.fontSize} "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Inter, sans-serif`,
        fill: new Fill({ color: style.color }),
        stroke: new Stroke({ 
          color: style.strokeColor, 
          width: strokeWidth 
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      })
    })
    
    // Create enhanced hover style (larger)
    const hoverStyle = new Style({
      text: new Text({
        text: icon,
        font: `bold 1.2rem "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Inter, sans-serif`,
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ 
          color: style.color, 
          width: strokeWidth + 1.5 
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      })
    })
    
    // Create selection/active style for better feedback (slightly larger)
    const activeStyle = new Style({
      text: new Text({
        text: icon,
        font: `bold 1.1rem "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Inter, sans-serif`,
        fill: new Fill({ color: '#ffeb3b' }),
        stroke: new Stroke({ 
          color: '#1a1a1a', 
          width: strokeWidth + 1 
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      })
    })
    
    // Set simple styles (no shadows)
    feature.setStyle(defaultStyle)
    feature.set('defaultStyle', defaultStyle)
    feature.set('hoverStyle', hoverStyle)
    feature.set('activeStyle', activeStyle)
    feature.set('categoryStyle', style)
    feature.set('isImportant', style.priority === 'high' || style.priority === 'highest')
    
    return feature
  }

  // Enhanced location label creation with better styling
  function createLocationLabelFeature(position: [number, number], name: string): Feature {
    const feature = new Feature({
      geometry: new Point(position),
      name: name,
      icon: '', // No icon for labels
      isLocation: true // Flag to identify location features
    })
    
    // Enhanced default style with better typography and size
    const defaultStyle = new Style({
      text: new Text({
        text: name,
        font: 'bold 14px "Inter", "Segoe UI", sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: '#1a1a1a', width: 3 }),
        textAlign: 'center',
        textBaseline: 'middle',
        maxAngle: 0,
        overflow: true,
        placement: 'point'
      })
    })
    
    // Enhanced hover style
    const hoverStyle = new Style({
      text: new Text({
        text: name,
        font: 'bold 16px "Inter", "Segoe UI", sans-serif',
        fill: new Fill({ color: '#ffeb3b' }), // Bright yellow on hover
        stroke: new Stroke({ color: '#1a1a1a', width: 4 }),
        textAlign: 'center',
        textBaseline: 'middle',
        maxAngle: 0,
        overflow: true,
        placement: 'point'
      })
    })
    
    // Active/selected style
    const activeStyle = new Style({
      text: new Text({
        text: name,
        font: 'bold 15px "Inter", "Segoe UI", sans-serif',
        fill: new Fill({ color: '#f59e0b' }), // Orange when active
        stroke: new Stroke({ color: '#1a1a1a', width: 3.5 }),
        textAlign: 'center',
        textBaseline: 'middle',
        maxAngle: 0,
        overflow: true,
        placement: 'point'
      })
    })
    
    // Set simple styles (no shadows)
    feature.setStyle(defaultStyle)
    feature.set('defaultStyle', defaultStyle)
    feature.set('hoverStyle', hoverStyle)
    feature.set('activeStyle', activeStyle)
    
    return feature
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
    
    // Remove all marker layers
    Object.values(markerLayers).forEach(layer => {
      if (map.getLayers().getArray().includes(layer)) {
        map.removeLayer(layer)
      }
    })
    
    // Remove all location label layers
    Object.values(locationLabelLayers).forEach(layer => {
      if (map.getLayers().getArray().includes(layer)) {
        map.removeLayer(layer)
      }
    })
    
    // Add the appropriate marker layer for the selected level
    const layerName =
      newLayer === overworldLayers ? 'Overworld' :
      newLayer === underworldLayers ? 'Underworld' :
      'Sky'
    
    // Set background color based on layer
    const mapElement = document.getElementById('map')
    if (mapElement) {
      if (layerName === 'Overworld') {
        mapElement.style.backgroundColor = '#3b85b9'
      } else {
        mapElement.style.backgroundColor = 'black'
      }
    }
    
    const markerLayer = markerLayers[layerName]
    if (markerLayer && !map.getLayers().getArray().includes(markerLayer)) {
      map.addLayer(markerLayer)
    }
    
    // Add the appropriate location label layer (always on top)
    const locationLayer = locationLabelLayers[layerName]
    if (locationLayer && !map.getLayers().getArray().includes(locationLayer)) {
      map.addLayer(locationLayer)
    }
    
    // Update marker counts
    updateMarkerCounts()
  }

  // Add base layer
  setBaseLayer(overworldLayers)
  map.getView().fit(bounds)

  // Add location markers as features
  locations.locations.forEach((location: any) => {
    const feature = createLocationLabelFeature([location.x + 512.5, location.y + 512.5], location.name)
    
    switch (location.labelType) {
      case 0:
        addLocationItem(feature, 'Underworld', 'Locations')
        break
      case 1:
        addLocationItem(feature, 'Overworld', 'Locations')
        break
      case 2:
        addLocationItem(feature, 'Sky', 'Locations')
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

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🌳', nameWithSpacesCapitalized, 'Trees')

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Trees')
          break
        case 0:
          addItem(feature, 'Underworld', 'Trees')
          break
        case 2:
          addItem(feature, 'Sky', 'Trees')
          break
      }
    }

    if (entity.type.includes('obelisk')) {
      const name = entity.type.replace('obelisk', ' Obelisk')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🗿', nameWithSpacesCapitalized, 'Obelisks')

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Obelisks')
          break
        case 0:
          addItem(feature, 'Underworld', 'Obelisks')
          break
        case 2:
          addItem(feature, 'Sky', 'Obelisks')
          break
      }
    }

    if (entity.type.includes('rocks')) {
      const name = entity.type.replace('rocks', ' Rock')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🪨', nameWithSpacesCapitalized, 'Ores')

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Ores')
          break
        case 0:
          addItem(feature, 'Underworld', 'Ores')
          break
        case 2:
          addItem(feature, 'Sky', 'Ores')
          break
      }
    }

    if (entity.type.includes('bank')) {
      const name = entity.type.replace('bank', ' Bank')
      const nameWithSpaces = name.replace('chest', ' Chest')
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '💰', nameWithSpaces, 'Banks')

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Banks')
          break
        case 0:
          addItem(feature, 'Underworld', 'Banks')
          break
        case 2:
          addItem(feature, 'Sky', 'Banks')
          break
      }
    }

    if (entity.type.includes('fire')) {
      const name = entity.type.replace('fire', ' Fire')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🔥', nameWithSpacesCapitalized, 'Fires')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Fires')
          break
        case 0:
          addItem(feature, 'Underworld', 'Fires')
          break
        case 2:
          addItem(feature, 'Sky', 'Fires')
          break
      }
    }

    if (entity.type.includes('smithingsource')) {
      const name = 'Anvil'

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🔨', name, 'Anvils')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Anvils')
          break
        case 0:
          addItem(feature, 'Underworld', 'Anvils')
          break
        case 2:
          addItem(feature, 'Sky', 'Anvils')
          break
      }
    }

    if (entity.type.includes('smeltingsource')) {
      const name = 'Furnace'
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🏭', name, 'Furnaces')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Furnaces')
          break
        case 0:
          addItem(feature, 'Underworld', 'Furnaces')
          break
        case 2:
          addItem(feature, 'Sky', 'Furnaces')
          break
      }
    }

    if (entity.type.includes('kiln')) {
      const name = 'Kiln'
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '⚱️', name, 'Kilns')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Kilns')
          break
        case 0:
          addItem(feature, 'Underworld', 'Kilns')
          break
        case 2:
          addItem(feature, 'Sky', 'Kilns')
          break
      }
    }

    if (entity.type.includes('heatsource')) {
      const name = 'Stove'

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🍳', name, 'Stoves')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Stoves')
          break
        case 0:
          addItem(feature, 'Underworld', 'Stoves')
          break
        case 2:
          addItem(feature, 'Sky', 'Stoves')
          break
      }
    }

    if (entity.type.includes('fishing')) {
      const name = entity.type.replace('fishing', ' Fishing')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], '🎣', nameWithSpacesCapitalized, 'Fishing Spots')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Fishing Spots')
          break
        case 0:
          addItem(feature, 'Underworld', 'Fishing Spots')
          break
        case 2:
          addItem(feature, 'Sky', 'Fishing Spots')
          break
      }
    }

    if (entity.type.includes('pumpkin')) {
      const name = entity.type.replace('pumpkin', ' Pumpkin')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('corn')) {
      const name = entity.type.replace('corn', ' Corn')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables');
          break
      }
    }

    if (entity.type.includes('potatoes')) {
      const name = entity.type.replace('potatoes', ' Potatoes')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('onion')) {
      const name = entity.type.replace('onion', ' Onion')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('flax')) {
      const name = entity.type.replace('flax', ' Flax')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('carrot')) {
      const name = entity.type.replace('carrot', ' Carrot')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('redmushroom')) {
      const name = entity.type.replace('redmushroom', 'Red Mushroom')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('plant') && entity.type != 'plant') {
      const name = entity.type.replace('plant', ' Plant')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('strawberries')) {
      const name = entity.type.replace('strawberries', 'Strawberries')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
          break
      }
    }

    if (entity.type.includes('watermelon')) {
      const name = entity.type.replace('watermelon', 'Watermelon')
      const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      const nameWithSpacesCapitalized =
        nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)

      const feature = createMarkerFeature([entity.x + 512.5, entity.z + 512.5], "🌾", nameWithSpacesCapitalized, 'Harvestables')
      

      switch (entity.lvl) {
        case 1:
          addItem(feature, 'Overworld', 'Harvestables')
          break
        case 0:
          addItem(feature, 'Underworld', 'Harvestables')
          break
        case 2:
          addItem(feature, 'Sky', 'Harvestables')
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

  // Enhanced popup system with rich content and animations
  function showPopup(content: string, position: [number, number]) {
    popupContent = content
    
    // Calculate display coordinates (relative to map center)
    const displayX = Math.round(position[0] - 512.5)
    const displayY = Math.round(position[1] - 512.5)
    
    // Create wiki URL from content
    const wikiName = content.replace(/\s+/g, '_').replace(/[()]/g, '').replace(/Lvl\._\d+/g, '').trim()
    const wikiUrl = `https://highspell.wiki/w/${wikiName}`
    
    // Determine marker category and info based on content
    const isNPC = content.includes('(Lvl.')
    const isShop = content.toLowerCase().includes('shop') || content.toLowerCase().includes('store')
    const isLocation = !content.includes('🌳') && !content.includes('🪨') && !isNPC && !isShop
    
    // Enhanced popup with rich content
    popupElement.innerHTML = `
      <div class="popup-content enhanced-popup">
        <div class="popup-header">
          <div class="popup-type-indicator ${isNPC ? 'npc' : isShop ? 'shop' : isLocation ? 'location' : 'resource'}">
            ${isNPC ? '👤' : isShop ? '🏪' : isLocation ? '📍' : '🔧'}
          </div>
          <div class="popup-info">
            <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="popup-link">
              ${content}
            </a>
            <div class="popup-coords">
              <span class="coord-group">
                <span class="coord-label">X:</span> 
                <span class="coord-value">${displayX}</span>
              </span>
              <span class="coord-group">
                <span class="coord-label">Y:</span> 
                <span class="coord-value">${displayY}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-action-btn center-btn" onclick="this.dispatchEvent(new CustomEvent('center-map', {bubbles: true}))">
            📍 Center
          </button>
          <button class="popup-action-btn share-btn" onclick="this.dispatchEvent(new CustomEvent('share-location', {bubbles: true}))">
            📤 Share
          </button>
          <button class="popup-close" type="button">&times;</button>
        </div>
      </div>
    `
    
    // Add event listeners for new actions
    const centerBtn = popupElement.querySelector('.center-btn') as HTMLElement
    const shareBtn = popupElement.querySelector('.share-btn') as HTMLElement
    
    if (centerBtn) {
      centerBtn.addEventListener('center-map', () => {
        map?.getView().animate({
          center: position,
          zoom: Math.max(map.getView().getZoom() || 4, 6),
          duration: 500
        })
      })
    }
    
    if (shareBtn) {
      shareBtn.addEventListener('share-location', () => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?pos_x=${displayX}&pos_y=${displayY}&lvl=${selectedLayer.value}`
        navigator.clipboard?.writeText(shareUrl).then(() => {
          shareBtn.innerHTML = '✓ Copied!'
          setTimeout(() => {
            shareBtn.innerHTML = '📤 Share'
          }, 2000)
        })
      })
    }
    
    popupOverlay.setPosition(position)
    popupElement.style.display = 'block'
    popupElement.style.opacity = '0'
    popupElement.style.transform = 'translate(-50%, -100%) translateY(20px) scale(0.8)'
    
    // Enhanced popup appearance animation
    requestAnimationFrame(() => {
      popupElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
      const feature = createMarkerFeature([npc.x + 512.5, npc.y + 512.5], '🏪', name, 'Shops')
      

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      switch (npc.mapLevel) {
        case 1:
          addItem(feature, 'Overworld', 'Shops')
          break
        case 0:
          addItem(feature, 'Underworld', 'Shops')
          break
        case 2:
          addItem(feature, 'Sky', 'Shops')
          break
      }
      return
    }

    if (npc.isAlwaysAggroOverride) {
      // Capitalize characters after spaces
      const name =
        (typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : '') +
        (npcDef.combat && npcDef.combat.level ? ' (Lvl. ' + npcDef.combat.level + ')' : '')
      const feature = createMarkerFeature([npc.x + 512.5, npc.y + 512.5], '😈', name, 'Aggro NPCs')
      

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      switch (npc.mapLevel) {
        case 1:
          addItem(feature, 'Overworld', 'Aggro NPCs')
          break
        case 0:
          addItem(feature, 'Underworld', 'Aggro NPCs')
          break
        case 2:
          addItem(feature, 'Sky', 'Aggro NPCs')
          break
      }
      return
    }

    // Check if npcDef has a definition for "combat"
    if (!npcDef) {
      // Add Regular NPC
      // Capitalize characters after spaces
      const name = typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      const feature = createMarkerFeature([npc.x + 512.5, npc.y + 512.5], '👤', name, 'NPCs')
      

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      switch (npc.mapLevel) {
        case 1:
          addItem(feature, 'Overworld', 'NPCs')
          break
        case 0:
          addItem(feature, 'Underworld', 'NPCs')
          break
        case 2:
          addItem(feature, 'Sky', 'NPCs')
          break
      }
      return
    }
    // Check if npcDef has a value for "combat"
    if (!npcDef.combat) {
      // Add Regular NPC
      // Capitalize characters after spaces
      const name = typeof npcDef.name === 'string' ? npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      const feature = createMarkerFeature([npc.x + 512.5, npc.y + 512.5], '👤', name, 'NPCs')
      

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      switch (npc.mapLevel) {
        case 1:
          addItem(feature, 'Overworld', 'NPCs')
          break
        case 0:
          addItem(feature, 'Underworld', 'NPCs')
          break
        case 2:
          addItem(feature, 'Sky', 'NPCs')
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
      const feature = createMarkerFeature([npc.x + 512.5, npc.y + 512.5], '⚔️', name, 'Attackable NPCs')
      

      // Bind Type to Marker Tooltip
      // Example type: polartree
      // Example Popup: "Polar Tree"
      switch (npc.mapLevel) {
        case 1:
          addItem(feature, 'Overworld', 'Attackable NPCs')
          break
        case 0:
          addItem(feature, 'Underworld', 'Attackable NPCs')
          break
        case 2:
          addItem(feature, 'Sky', 'Attackable NPCs')
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

  // Watch for layer changes
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

// Cleanup on component unmount
onUnmounted(() => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
  }
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

    <!-- Map container (clean, no child elements) -->
    <div id="map"></div>

    <!-- UI Controls positioned outside the map -->
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
                :data-category="category.name"
              >
                <span class="filter-icon">{{ category.icon }}</span>
                <span class="filter-name">{{ category.name }}</span>
                <span class="marker-count">{{ category.count }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Enhanced Coordinates Display with more info -->
    <div class="coordinates-display enhanced-coords">
      <div class="coord-header">
        <span class="coord-icon">📍</span>
        <span class="coord-title">Position</span>
      </div>
      <div class="coord-values">
        <div class="coord-group">
          <span class="coord-label">X:</span>
          <span class="coord-value">{{ mouseCoords.x }}</span>
        </div>
        <div class="coord-group">
          <span class="coord-label">Y:</span>
          <span class="coord-value">{{ mouseCoords.y }}</span>
        </div>
      </div>
      <div class="layer-indicator">
        <span class="layer-icon">{{ getCurrentLayerInfo().icon }}</span>
        <span class="layer-name">{{ getCurrentLayerInfo().name }}</span>
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

/* Enhanced controls container - Compressed */
.map-controls-container {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 280px; /* Reduced from 360px */
  max-height: calc(100vh - 120px);
  z-index: 1001;
}

/* Unified control panel */
.unified-controls {
  background: rgba(26, 26, 26, 0.96);
  backdrop-filter: blur(12px);
  border-radius: 12px; /* Reduced from 16px */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); /* Reduced shadow */
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
  padding: 8px 16px 4px 16px; /* Reduced padding */
  display: flex;
  align-items: center;
  gap: 8px; /* Reduced gap */
  color: var(--theme-accent);
  position: sticky;
  top: 0;
  z-index: 10;
}

.section-icon {
  font-size: 16px; /* Reduced from 18px */
}

.section-title {
  font-size: 14px; /* Reduced from 15px */
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

/* Layer controls - Compressed */
.layer-buttons {
  display: flex;
  flex-direction: row;
  gap: 6px; /* Reduced from 8px */
  padding: 8px 16px 12px 16px; /* Reduced padding */
}

.layer-btn {
  padding: 8px 12px; /* Reduced padding */
  border: 2px solid var(--theme-border);
  border-radius: 8px; /* Reduced from 10px */
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px; /* Reduced from 14px */
  font-weight: 600;
  color: var(--theme-text-primary);
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Reduced shadow */
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

/* Search panel - Compressed */
.search-section {
  border-bottom: 1px solid var(--theme-border);
}

.search-input-container {
  position: relative;
  margin-bottom: 6px; /* Reduced from 8px */
  padding: 8px 16px 0 16px; /* Reduced padding */
}

.search-input {
  width: 100%;
  padding: 10px 14px; /* Reduced padding */
  border: 2px solid var(--theme-border);
  border-radius: 8px; /* Reduced from 12px */
  font-size: 13px; /* Reduced from 14px */
  transition: all 0.3s ease;
  background: var(--theme-background-mute);
  color: var(--theme-text-primary);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1); /* Reduced shadow */
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
  max-height: 180px; /* Reduced from 200px */
  overflow-y: auto;
  padding: 0 16px 12px; /* Reduced padding */
}

/* Panel Toggle Button - Compressed */
.panel-toggle-container {
  padding: 6px 16px 12px; /* Reduced padding */
  border-top: 1px solid var(--theme-border-light);
  margin-top: 6px; /* Reduced from 8px */
}

.panel-toggle-btn {
  width: 100%;
  padding: 8px 12px; /* Reduced padding */
  border: 2px solid var(--theme-border);
  border-radius: 8px; /* Reduced from 10px */
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px; /* Reduced from 13px */
  font-weight: 600;
  color: var(--theme-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px; /* Reduced from 8px */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Reduced shadow */
}

.panel-toggle-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-transparent-10);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.toggle-icon {
  font-size: 14px; /* Reduced from 16px */
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
  gap: 8px; /* Reduced from 12px */
  padding: 8px 12px; /* Reduced padding */
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--theme-border-light);
  color: var(--theme-text-primary);
  border-radius: 6px; /* Reduced from 8px */
  margin-bottom: 4px; /* Reduced from 6px */
  background: var(--theme-background-mute);
}

.search-result-item:hover {
  background: var(--theme-accent-transparent-10);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

/* Filter controls with enhanced category indicators - Compressed */
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px; /* Reduced from 8px */
  padding: 8px 16px 12px 16px; /* Reduced padding */
}

.filter-tag {
  padding: 6px 10px; /* Reduced padding */
  border: 2px solid var(--theme-border);
  border-radius: 20px; /* Reduced from 24px */
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 11px; /* Reduced from 12px */
  font-weight: 500;
  color: var(--theme-text-muted);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Reduced shadow */
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px; /* Reduced from 6px */
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

/* Category-specific colors for better contrast */
.filter-tag[data-category="Banks"] {
  --category-color: #ffd700;
  --category-bg: rgba(255, 215, 0, 0.1);
  --category-border: rgba(255, 215, 0, 0.3);
}

.filter-tag[data-category="Shops"] {
  --category-color: #00ff7f;
  --category-bg: rgba(0, 255, 127, 0.1);
  --category-border: rgba(0, 255, 127, 0.3);
}

.filter-tag[data-category="NPCs"] {
  --category-color: #87ceeb;
  --category-bg: rgba(135, 206, 235, 0.1);
  --category-border: rgba(135, 206, 235, 0.3);
}

.filter-tag[data-category="Attackable NPCs"] {
  --category-color: #ff6347;
  --category-bg: rgba(255, 99, 71, 0.1);
  --category-border: rgba(255, 99, 71, 0.3);
}

.filter-tag[data-category="Aggro NPCs"] {
  --category-color: #ff1493;
  --category-bg: rgba(255, 20, 147, 0.1);
  --category-border: rgba(255, 20, 147, 0.3);
}

.filter-tag[data-category="Trees"] {
  --category-color: #90ee90;
  --category-bg: rgba(144, 238, 144, 0.1);
  --category-border: rgba(144, 238, 144, 0.3);
}

.filter-tag[data-category="Obelisks"] {
  --category-color: #dda0dd;
  --category-bg: rgba(221, 160, 221, 0.1);
  --category-border: rgba(221, 160, 221, 0.3);
}

.filter-tag[data-category="Ores"] {
  --category-color: #d2691e;
  --category-bg: rgba(210, 105, 30, 0.1);
  --category-border: rgba(210, 105, 30, 0.3);
}

.filter-tag[data-category="Fires"] {
  --category-color: #ff4500;
  --category-bg: rgba(255, 69, 0, 0.1);
  --category-border: rgba(255, 69, 0, 0.3);
}

.filter-tag[data-category="Anvils"] {
  --category-color: #c0c0c0;
  --category-bg: rgba(192, 192, 192, 0.1);
  --category-border: rgba(192, 192, 192, 0.3);
}

.filter-tag[data-category="Furnaces"] {
  --category-color: #ff8c00;
  --category-bg: rgba(255, 140, 0, 0.1);
  --category-border: rgba(255, 140, 0, 0.3);
}

.filter-tag[data-category="Kilns"] {
  --category-color: #cd853f;
  --category-bg: rgba(205, 133, 63, 0.1);
  --category-border: rgba(205, 133, 63, 0.3);
}

.filter-tag[data-category="Stoves"] {
  --category-color: #ffa500;
  --category-bg: rgba(255, 165, 0, 0.1);
  --category-border: rgba(255, 165, 0, 0.3);
}

.filter-tag[data-category="Fishing Spots"] {
  --category-color: #00bfff;
  --category-bg: rgba(0, 191, 255, 0.1);
  --category-border: rgba(0, 191, 255, 0.3);
}

.filter-tag[data-category="Harvestables"] {
  --category-color: #adff2f;
  --category-bg: rgba(173, 255, 47, 0.1);
  --category-border: rgba(173, 255, 47, 0.3);
}

.filter-tag[data-category="Locations"] {
  --category-color: #ffffff;
  --category-bg: rgba(255, 255, 255, 0.1);
  --category-border: rgba(255, 255, 255, 0.3);
}

.filter-tag.active[data-category] {
  background: var(--category-bg);
  border-color: var(--category-border);
  color: var(--category-color);
}

.filter-tag:hover[data-category] {
  background: var(--category-bg);
  border-color: var(--category-border);
  color: var(--category-color);
}

/* Marker count indicator */
.marker-count {
  background: var(--category-color, var(--theme-accent));
  color: var(--theme-text-dark);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
}

.filter-tag:not(.active) .marker-count {
  background: var(--theme-text-muted);
  color: var(--theme-background-soft);
}

/* Filter tag components */
.filter-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.filter-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.filter-tag.active .filter-name {
  font-weight: 600;
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
  
  
  .coordinates-display {
    left: 8px;
    bottom: 8px;
    font-size: 11px;
  }
}
/* Enhanced coordinates display */
.enhanced-coords {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(26, 26, 26, 0.95);
  color: var(--theme-text-primary);
  padding: 16px;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  z-index: 1001;
  backdrop-filter: blur(8px);
  border: 2px solid var(--theme-border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  transition: all 0.3s ease;
}

.enhanced-coords:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.coord-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--theme-border-light);
}

.coord-icon {
  font-size: 16px;
}

.coord-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--theme-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.coord-values {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.coord-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.coord-label {
  font-size: 11px;
  color: var(--theme-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.coord-value {
  font-weight: 800;
  font-size: 18px;
  color: var(--theme-accent-light);
  font-family: 'Courier New', monospace;
  background: var(--theme-accent-transparent-10);
  padding: 4px 8px;
  border-radius: 6px;
  min-width: 50px;
  text-align: center;
}

.layer-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--theme-border-light);
}

.layer-icon {
  font-size: 14px;
}

.layer-name {
  font-size: 12px;
  color: var(--theme-text-muted);
  font-weight: 600;
}

/* Map markers with enhanced hover effects and text shadows */
:global(.map-marker) {
  transition: all 0.2s ease !important;
  position: relative !important;
  z-index: 999 !important;
  pointer-events: none !important;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
}

:global(.map-marker *) {
  pointer-events: auto !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5) !important;
}

:global(.text-label) {
  pointer-events: none !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

:global(.text-label > *) {
  pointer-events: auto !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6) !important;
}

:global(.marker) {
  pointer-events: auto !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5) !important;
}

:global(.map-marker:hover) {
  z-index: 1000 !important;
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
  transform: scale(1.05);
}

:global(.map-marker:hover *) {
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7) !important;
}

:global(.marker:hover) {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  transform: scale(1.1);
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7) !important;
}

:global(.text-label:hover) {
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6));
  transform: scale(1.05);
}

:global(.text-label:hover > *) {
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8) !important;
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

/* Enhanced popup styles with rich content */
:global(.ol-popup) {
  position: absolute;
  background: var(--theme-background-soft);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  padding: 0;
  min-width: 280px;
  max-width: 400px;
  font-size: 14px;
  pointer-events: auto;
  z-index: 2000;
  border: 2px solid var(--theme-border);
  backdrop-filter: blur(16px);
  overflow: visible;
  margin-bottom: 16px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:global(.ol-popup::after) {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 16px solid transparent;
  border-right: 16px solid transparent;
  border-top: 16px solid var(--theme-background-soft);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

:global(.ol-popup::before) {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-top: 18px solid var(--theme-border);
  z-index: -1;
}

:global(.enhanced-popup) {
  background: var(--theme-background-soft);
  color: var(--theme-text-primary);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

:global(.popup-header) {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 16px;
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border-bottom: 1px solid var(--theme-border-light);
}

:global(.popup-type-indicator) {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: var(--theme-accent-transparent-20);
  border: 2px solid var(--theme-accent-transparent-40);
  transition: all 0.2s ease;
}

:global(.popup-type-indicator.npc) {
  background: #3b82f6;
  border-color: #60a5fa;
  color: white;
}

:global(.popup-type-indicator.shop) {
  background: #10b981;
  border-color: #34d399;
  color: white;
}

:global(.popup-type-indicator.location) {
  background: #f59e0b;
  border-color: #fbbf24;
  color: white;
}

:global(.popup-type-indicator.resource) {
  background: #8b5cf6;
  border-color: #a78bfa;
  color: white;
}

:global(.popup-info) {
  flex: 1;
  min-width: 0;
}

:global(.popup-link) {
  color: var(--theme-accent);
  font-weight: 700;
  font-size: 16px;
  line-height: 1.3;
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
  word-break: break-word;
  transition: all 0.2s ease;
}

:global(.popup-link:hover) {
  color: var(--theme-accent-light);
  text-decoration: underline;
  transform: translateX(2px);
}

:global(.popup-coords) {
  display: flex;
  gap: 16px;
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 500;
  font-family: 'Courier New', monospace;
  background: var(--theme-background-mute);
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 4px;
}

:global(.coord-group) {
  display: flex;
  align-items: center;
  gap: 4px;
}

:global(.coord-label) {
  color: var(--theme-text-muted);
  font-weight: 600;
}

:global(.coord-value) {
  color: var(--theme-accent);
  font-weight: 700;
}

:global(.popup-actions) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 20px;
  gap: 8px;
  background: var(--theme-background-mute);
}

:global(.popup-action-btn) {
  background: var(--theme-accent-transparent-20);
  border: 2px solid var(--theme-accent-transparent-40);
  border-radius: 8px;
  color: var(--theme-text-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  transition: all 0.2s ease;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:global(.popup-action-btn:hover) {
  background: var(--theme-accent-transparent-40);
  border-color: var(--theme-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:global(.popup-close) {
  background: var(--theme-background-mute);
  border: 2px solid var(--theme-border);
  font-size: 18px;
  color: var(--theme-text-muted);
  cursor: pointer;
  padding: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-weight: normal;
  line-height: 1;
}

:global(.popup-close:hover) {
  background: #ef4444;
  border-color: #f87171;
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Responsive design */
@media (max-width: 768px) {
  .map-controls-container {
    width: 320px;
    right: 8px;
    top: 8px;
  }
  
  .enhanced-coords {
    left: 8px;
    bottom: 8px;
    padding: 12px;
    min-width: 150px;
  }
  
  .coord-values {
    gap: 12px;
  }
  
  .coord-value {
    font-size: 16px;
    min-width: 40px;
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
  
  .filter-tag {
    font-size: 11px;
    padding: 5px 10px;
  }
  
  .enhanced-coords {
    padding: 10px;
    min-width: 130px;
  }
  
  .coord-title {
    font-size: 12px;
  }
  
  .coord-value {
    font-size: 14px;
    padding: 2px 6px;
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
