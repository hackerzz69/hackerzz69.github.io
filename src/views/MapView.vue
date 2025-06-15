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
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import MapControls from '@/components/MapControls.vue'
import MapPositionIndicator from '@/components/MapPositionIndicator.vue'
import MapPopup from '@/components/MapPopup.vue'
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
import { defaults as defaultInteractions } from 'ol/interaction'

let map: Map
let overworldLayers: Group
let underworldLayers: Group
let skyLayers: Group

// Enhanced reactive state
const selectedLayer = ref('Overworld')
const isLoading = ref(true)
const mouseCoords = reactive({ x: 0, y: 0 })

// Popup state
const popupVisible = ref(false)
const popupContent = ref('')
const popupPosition = ref<[number, number] | null>(null)

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

// All searchable items - moved to component

const getCurrentLayerInfo = () => {
  return layers.value.find(layer => layer.id === selectedLayer.value) || layers.value[0]
}

const updateMarkerCounts = () => {
  markerCategories.value.forEach(category => {
    const currentLayerMarkers = levelMarkers[selectedLayer.value]
    category.count = currentLayerMarkers[category.name]?.length || 0
  })
}

// Event handlers for the MapSearchFilter component
const handleLayerChanged = (layerId: string) => {
  selectedLayer.value = layerId
}

const handleSearchLocationSelected = (result: any) => {
  if (result.layer !== selectedLayer.value) {
    selectedLayer.value = result.layer
  }
  
  // Center map on the location
  setTimeout(() => {
    map?.getView().setCenter([result.x, result.y])
    map?.getView().setZoom(6)
  }, 100)
}

const handleMarkerCategoryToggled = (categoryName: string, visible: boolean) => {
  const category = markerCategories.value.find(cat => cat.name === categoryName)
  if (!category) return
  
  category.visible = visible
  
  const currentLayerMarkers = levelMarkers[selectedLayer.value]
  if (currentLayerMarkers[categoryName]) {
    // Handle locations separately (they use location label layers)
    if (categoryName === 'Locations') {
      const layer = locationLabelLayers[selectedLayer.value]
      const source = layer.getSource()
      if (source) {
        currentLayerMarkers[categoryName].forEach((feature: Feature) => {
          if (visible) {
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
          if (visible) {
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

const handleAllMarkersToggled = (visible: boolean) => {
  markerCategories.value.forEach(category => {
    if (category.visible !== visible) {
      handleMarkerCategoryToggled(category.name, visible)
    }
  })
}

// Popup event handlers
const showPopup = (content: string, position: [number, number]) => {
  popupContent.value = content
  popupPosition.value = position
  popupVisible.value = true
}

const hidePopup = () => {
  popupVisible.value = false
  popupContent.value = ''
  popupPosition.value = null
}
// Event handlers for the MapSearchFilter component

onMounted(() => {
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
          
          // Center the map on the clicked marker
          map.getView().animate({
            center: coordinates,
            duration: 500,
            zoom: Math.max(map.getView().getZoom() || 4, 5)
          })
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

  // Entity type mapping configuration for cleaner code
  const entityTypeConfig = [
    {
      match: (type: string) => (type.includes('tree') || type.includes('cherryblossom')) && type !== 'treestump',
      icon: '🌳',
      category: 'Trees',
      nameFormatter: (type: string) => {
        let name = type.replace('tree', ' Tree').replace('blossom', ' Blossom')
        return formatEntityName(name)
      }
    },
    {
      match: (type: string) => type.includes('obelisk'),
      icon: '🗿',
      category: 'Obelisks',
      nameFormatter: (type: string) => formatEntityName(type.replace('obelisk', ' Obelisk'))
    },
    {
      match: (type: string) => type.includes('rocks'),
      icon: '🪨',
      category: 'Ores',
      nameFormatter: (type: string) => formatEntityName(type.replace('rocks', ' Rock'))
    },
    {
      match: (type: string) => type.includes('bank'),
      icon: '💰',
      category: 'Banks',
      nameFormatter: (type: string) => type.replace('bank', ' Bank').replace('chest', ' Chest')
    },
    {
      match: (type: string) => type.includes('fire'),
      icon: '🔥',
      category: 'Fires',
      nameFormatter: (type: string) => formatEntityName(type.replace('fire', ' Fire'))
    },
    {
      match: (type: string) => type.includes('smithingsource'),
      icon: '🔨',
      category: 'Anvils',
      nameFormatter: () => 'Anvil'
    },
    {
      match: (type: string) => type.includes('smeltingsource'),
      icon: '🏭',
      category: 'Furnaces',
      nameFormatter: () => 'Furnace'
    },
    {
      match: (type: string) => type.includes('kiln'),
      icon: '⚱️',
      category: 'Kilns',
      nameFormatter: () => 'Kiln'
    },
    {
      match: (type: string) => type.includes('heatsource'),
      icon: '🍳',
      category: 'Stoves',
      nameFormatter: () => 'Stove'
    },
    {
      match: (type: string) => type.includes('fishing'),
      icon: '🎣',
      category: 'Fishing Spots',
      nameFormatter: (type: string) => formatEntityName(type.replace('fishing', ' Fishing'))
    },
    // Harvestables - each with appropriate emoji
    {
      match: (type: string) => type.includes('pumpkin'),
      icon: '🎃',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('pumpkin', ' Pumpkin'))
    },
    {
      match: (type: string) => type.includes('corn'),
      icon: '🌽',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('corn', ' Corn'))
    },
    {
      match: (type: string) => type.includes('potatoes'),
      icon: '🥔',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('potatoes', ' Potatoes'))
    },
    {
      match: (type: string) => type.includes('onion'),
      icon: '🧅',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('onion', ' Onion'))
    },
    {
      match: (type: string) => type.includes('flax'),
      icon: '🌾',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('flax', ' Flax'))
    },
    {
      match: (type: string) => type.includes('carrot'),
      icon: '🥕',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('carrot', ' Carrot'))
    },
    {
      match: (type: string) => type.includes('redmushroom'),
      icon: '🍄',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('redmushroom', 'Red Mushroom'))
    },
    {
      match: (type: string) => type.includes('plant') && type !== 'plant',
      icon: '🌿',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('plant', ' Plant'))
    },
    {
      match: (type: string) => type.includes('strawberries'),
      icon: '🍓',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('strawberries', 'Strawberries'))
    },
    {
      match: (type: string) => type.includes('watermelon'),
      icon: '🍉',
      category: 'Harvestables',
      nameFormatter: (type: string) => formatEntityName(type.replace('watermelon', 'Watermelon'))
    }
  ]

  // Helper function to format entity names consistently
  function formatEntityName(name: string): string {
    const nameWithSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2')
    return nameWithSpaces.charAt(0).toUpperCase() + nameWithSpaces.slice(1)
  }

  // Helper function to add entity to appropriate layer based on level
  function addEntityToLayer(feature: Feature, entityLevel: number, category: string) {
    const layerMap = {
      0: 'Underworld',
      1: 'Overworld', 
      2: 'Sky'
    }
    const layerName = layerMap[entityLevel as keyof typeof layerMap]
    if (layerName) {
      addItem(feature, layerName, category)
    }
  }

  // Process entities with the new streamlined approach
  const worldEntities = (entitiesData as any).worldEntities || []
  worldEntities.forEach((entity: any) => {
    // Find matching configuration for this entity type
    const config = entityTypeConfig.find(cfg => cfg.match(entity.type))
    
    if (config) {
      const name = config.nameFormatter(entity.type)
      const feature = createMarkerFeature(
        [entity.x + 512.5, entity.z + 512.5], 
        config.icon, 
        name, 
        config.category
      )
      addEntityToLayer(feature, entity.lvl, config.category)
    }
  })

  // NPC type configuration for cleaner processing
  const npcTypeConfig = [
    {
      condition: (npc: any, npcDef: any) => Boolean(npc.shopdef_id),
      icon: '🏪',
      category: 'Shops',
      nameFormatter: (npcDef: any) => 
        typeof npcDef.name === 'string' ? 
        npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
    },
    {
      condition: (npc: any) => Boolean(npc.isAlwaysAggroOverride),
      icon: '😈', 
      category: 'Aggro NPCs',
      nameFormatter: (npcDef: any) => {
        const name = typeof npcDef.name === 'string' ? 
          npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
        const level = npcDef.combat?.level ? ` (Lvl. ${npcDef.combat.level})` : ''
        return name + level
      }
    },
    {
      condition: (npc: any, npcDef: any) => Boolean(npcDef?.combat),
      icon: '⚔️',
      category: 'Attackable NPCs', 
      nameFormatter: (npcDef: any) => {
        const name = typeof npcDef.name === 'string' ? 
          npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
        const level = npcDef.combat?.level ? ` (Lvl. ${npcDef.combat.level})` : ''
        return name + level
      }
    },
    {
      condition: () => true, // Default case - regular NPC
      icon: '👤',
      category: 'NPCs',
      nameFormatter: (npcDef: any) => 
        typeof npcDef.name === 'string' ? 
        npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
    }
  ]

  // Helper function to add NPC to appropriate layer based on map level
  function addNPCToLayer(feature: Feature, mapLevel: number, category: string) {
    const layerMap = {
      0: 'Underworld',
      1: 'Overworld',
      2: 'Sky'
    }
    const layerName = layerMap[mapLevel as keyof typeof layerMap]
    if (layerName) {
      addItem(feature, layerName, category)
    }
  }

  // Process NPCs with streamlined approach
  npcs.npcs.forEach((npc: any) => {
    const npcDef = npcDefinitions.npcDefs.find((def: any) => npc.npcdef_id === def._id) as any
    if (!npcDef) return

    // Find the first matching configuration (order matters - more specific conditions first)
    const config = npcTypeConfig.find(cfg => cfg.condition(npc, npcDef))
    
    if (config) {
      const name = config.nameFormatter(npcDef)
      if (name) { // Only create marker if name is valid
        const feature = createMarkerFeature(
          [npc.x + 512.5, npc.y + 512.5], 
          config.icon, 
          name, 
          config.category
        )
        addNPCToLayer(feature, npc.mapLevel, config.category)
      }
    }
  })

  // Animate marker movement (for player position)
  function animateMarker(marker: Overlay, toCoords: [number, number], duration = 1000) {
    const from = marker.getPosition()
    // Convert coordinates to map coordinates (same as other markers)
    const to = [toCoords[0], toCoords[1]]
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

  // Create player position marker (reusable function)
  function createPlayerMarker(x: number, y: number): Overlay {
    // Convert coordinates to map coordinates
    const mapX = x
    const mapY = y
    
    // Create player position marker element with spinning animation
    const markerElement = document.createElement('div')
    markerElement.className = 'text-label'
    markerElement.innerHTML = `<div class="marker playerPosition">
      <span style="
        display: inline-block;
        font-size:1.5rem;
        color:red;
        text-shadow: 0px 0px 8px black;
        animation: spin 10s linear infinite;
        transform-origin: center;
      ">❌</span>
    </div>`
    markerElement.title = 'You are here'
    
    // Add CSS keyframes for spinning animation if not already present
    if (!document.querySelector('#player-marker-styles')) {
      const style = document.createElement('style')
      style.id = 'player-marker-styles'
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }
    
    // Create and return overlay
    return new Overlay({
      position: [mapX, mapY],
      element: markerElement,
      positioning: 'center-center'
    })
  }

  // Handle URL params for initial view/marker
  const urlParams = new URLSearchParams(window.location.search)
  const level = urlParams.get('lvl')
  const posX = urlParams.get('pos_x')
  const posY = urlParams.get('pos_y')
  const hideDecor = urlParams.get('hide_decor')
  let playPositionMarker: Overlay | null = null
  
  if (posX && posY) {
    // Create player marker using the reusable function
    playPositionMarker = createPlayerMarker(+posX, +posY)
    
    // Set map center to the player position with higher zoom and smooth animation
    map.getView().animate({
      center: [+posX, +posY],
      zoom: 20, // Increased zoom level for better visibility
      duration: 1500 // Smooth zoom animation
    })
    
    // Add overlay to map
    map.addOverlay(playPositionMarker)
    
    // Set layer if specified in URL
    if (level && ['Overworld', 'Underworld', 'Sky'].includes(level)) {
      selectedLayer.value = level
    }
  }

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

  // Handle real-time player movement messages
  window.addEventListener('message', (event: any) => {
    if (event.data.X && event.data.Y && event.data.lvl) {
      // Switch to the appropriate layer
      const layerName = event.data.lvl
      if (['Overworld', 'Underworld', 'Sky'].includes(layerName)) {
        selectedLayer.value = layerName
        switch (layerName) {
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
      }
      
      // Handle player marker
      if (playPositionMarker) {
        // Animate existing marker to new position
        animateMarker(playPositionMarker, [event.data.X, event.data.Y])
      } else {
        // Create new player marker if it doesn't exist and zoom in
        playPositionMarker = createPlayerMarker(event.data.X, event.data.Y)
        map.addOverlay(playPositionMarker)
        
        // Zoom into the player's position when marker is first created
        map.getView().animate({
          center: [event.data.X + 512.5, event.data.Y + 512.5],
          zoom: 8, // Zoom in for better visibility
          duration: 1500 // Smooth zoom animation
        })
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
    // Set map height to full viewport
    const mapElement = document.getElementById('map')
    if (mapElement) {
      mapElement.style.height = '100vh'
      mapElement.style.width = '100vw'
    }
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
  <!-- Loading overlay -->
  <LoadingSpinner :visible="isLoading" message="Loading map..." />

  <!-- Map container with UI elements inside -->
  <div id="map">
    <!-- UI Controls positioned inside the map -->
    <!-- Enhanced Layer Controls -->
    <div class="map-controls-container">
      <!-- Search and Filter Component -->
      <MapControls 
        :selected-layer="selectedLayer"
        :layers="layers"
        :marker-categories="markerCategories"
        @layer-changed="handleLayerChanged"
        @search-location-selected="handleSearchLocationSelected"
        @marker-category-toggled="handleMarkerCategoryToggled"
        @all-markers-toggled="handleAllMarkersToggled"
      />
    </div>

    <!-- Position Indicator Component -->
    <MapPositionIndicator 
      :coordinates="mouseCoords"
      :current-layer="getCurrentLayerInfo()"
    />

    <!-- Popup Component -->
    <MapPopup
      :map="map"
      :content="popupContent"
      :position="popupPosition"
      :visible="popupVisible"
      :selected-layer="selectedLayer"
      @close="hidePopup"
    />
  </div>
</template>

<style scoped>
/* Using consistent website theme colors */

#map {
  height: calc(100vh - 75px);
  width: 100%;
  position: relative;
  z-index: 1;
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

/* Responsive design */
@media (max-width: 768px) {
  .map-controls-container {
    width: 320px;
    right: 8px;
    top: 8px;
  }
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
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

:global(.text-label) {
  pointer-events: none !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

:global(.text-label > *) {
  pointer-events: auto !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
}

:global(.marker) {
  pointer-events: auto !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

:global(.map-marker:hover) {
  z-index: 1000 !important;
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
  transform: scale(1.05);
}

:global(.map-marker:hover *) {
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
}

:global(.marker:hover) {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  transform: scale(1.1);
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
}

:global(.text-label:hover) {
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6));
  transform: scale(1.05);
}

:global(.text-label:hover > *) {
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
}

:global(.marker) {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 1em;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  user-select: none;
}

:global(.text-label) {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  pointer-events: auto !important;
  user-select: none;
}

/* Map markers with enhanced hover effects and text shadows */
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
