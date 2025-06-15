<template>
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
          @click="$emit('layerChanged', layer.id)"
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
            @click="toggleMarkerCategory(category.name)"
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
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import locations from '@/assets/markerInformation/Locations.json'
import npcs from '@/assets/markerInformation/NPCs.json'
import npcDefinitions from '@/assets/markerInformation/NPCDefs.json'

// Props
interface Props {
  selectedLayer: string
  layers: Array<{
    id: string
    name: string
    icon: string
    color: string
    description: string
  }>
  markerCategories: Array<{
    name: string
    icon: string
    visible: boolean
    count: number
  }>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  layerChanged: [layerId: string]
  searchLocationSelected: [result: any]
  markerCategoryToggled: [categoryName: string, visible: boolean]
  allMarkersToggled: [visible: boolean]
}>()

// Reactive state
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const allMarkersVisible = ref(true)
const isPanelExpanded = ref(false)

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
  if (item.layer === props.selectedLayer) score += 10
  
  return score
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
}

const goToLocation = (result: any) => {
  emit('searchLocationSelected', result)
  clearSearch()
}

const toggleAllMarkers = () => {
  allMarkersVisible.value = !allMarkersVisible.value
  emit('allMarkersToggled', allMarkersVisible.value)
}

const toggleMarkerCategory = (categoryName: string) => {
  const category = props.markerCategories.find(cat => cat.name === categoryName)
  if (!category) return
  
  category.visible = !category.visible
  emit('markerCategoryToggled', categoryName, category.visible)
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

// Watch for changes in allMarkersVisible to update individual category states
watch(allMarkersVisible, (newValue) => {
  props.markerCategories.forEach(category => {
    if (category.visible !== newValue) {
      category.visible = newValue
    }
  })
})

onMounted(() => {
  initializeSearchableItems()
})
</script>

<style scoped>
/* Using consistent website theme colors */

/* Unified control panel */
.unified-controls {
  background: rgba(26, 26, 26, 0.96);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
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
  padding: 8px 16px 4px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--theme-accent);
  position: sticky;
  top: 0;
  z-index: 10;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 14px;
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
  gap: 6px;
  padding: 8px 16px 12px 16px;
}

.layer-btn {
  padding: 8px 12px;
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-text-primary);
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  margin-bottom: 6px;
  padding: 8px 16px 0 16px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.3s ease;
  background: var(--theme-background-mute);
  color: var(--theme-text-primary);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
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
  max-height: 180px;
  overflow-y: auto;
  padding: 0 16px 12px;
}

/* Panel Toggle Button - Compressed */
.panel-toggle-container {
  padding: 6px 16px 12px;
  border-top: 1px solid var(--theme-border-light);
  margin-top: 6px;
}

.panel-toggle-btn {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.panel-toggle-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-transparent-10);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.toggle-icon {
  font-size: 14px;
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
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--theme-border-light);
  color: var(--theme-text-primary);
  border-radius: 6px;
  margin-bottom: 4px;
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
  gap: 6px;
  padding: 8px 16px 12px 16px;
}

.filter-tag {
  padding: 6px 10px;
  border: 2px solid var(--theme-border);
  border-radius: 20px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-text-muted);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
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

.filter-icon {
  font-size: 14px;
}

.filter-name {
  font-size: 11px;
  white-space: nowrap;
}

.marker-count {
  background: var(--theme-accent-transparent-20);
  color: var(--theme-accent);
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
}
</style>
