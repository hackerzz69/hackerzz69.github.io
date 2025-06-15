<template>
  <div class="coordinates-display enhanced-coords">
    <!-- Player Position (in highlite mode) or Mouse Position (normal mode) -->
    <div class="coord-header">
      <span class="coord-icon">📍</span>
      <span class="coord-title">{{ isHighliteMode ? 'Player' : 'Position' }}</span>
    </div>
    <div class="coord-values">
      <div class="coord-group">
        <span class="coord-label">X:</span>
        <span class="coord-value">{{ coordinates.x }}</span>
      </div>
      <div class="coord-group">
        <span class="coord-label">Y:</span>
        <span class="coord-value">{{ coordinates.y }}</span>
      </div>
    </div>
    
    <!-- Pinned Position (only in highlite mode when something is pinned) -->
    <div v-if="isHighliteMode && pinnedMarker?.isPinned" class="pinned-coords">
      <div class="coord-header pinned-header">
        <span class="coord-icon">📌</span>
        <span class="coord-title">Pinned</span>
        <button class="remove-pin-btn" @click="emit('removePin')" title="Remove Pin">
          ✕
        </button>
      </div>
      <div class="coord-values">
        <div class="coord-group">
          <span class="coord-label">X:</span>
          <span class="coord-value">{{ pinnedMarker.x }}</span>
        </div>
        <div class="coord-group">
          <span class="coord-label">Y:</span>
          <span class="coord-value">{{ pinnedMarker.y }}</span>
        </div>
      </div>
    </div>
    
    <div class="layer-indicator">
      <span class="layer-icon">{{ currentLayer.icon }}</span>
      <span class="layer-name">{{ currentLayer.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  coordinates: {
    x: number
    y: number
  }
  currentLayer: {
    id: string
    name: string
    icon: string
    color: string
    description: string
  }
  isHighliteMode?: boolean
  pinnedMarker?: {
    x: number
    y: number
    isPinned: boolean
  }
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  removePin: []
}>()
</script>

<style scoped>
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

.pinned-coords {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--theme-border-light);
}

.pinned-header {
  margin-bottom: 8px;
}

.pinned-header .coord-icon {
  color: #ff6b35;
}

.pinned-header .coord-title {
  color: #ff6b35;
}

.pinned-coords .coord-value {
  color: #ff6b35;
  background: rgba(255, 107, 53, 0.1);
}

.pinned-header {
  position: relative;
}

.remove-pin-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(239, 68, 68, 0.8);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 10px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
}

.remove-pin-btn:hover {
  background: rgba(239, 68, 68, 1);
  transform: translateY(-50%) scale(1.1);
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

/* Responsive design */
@media (max-width: 768px) {
  .coordinates-display {
    left: 8px;
    bottom: 8px;
    font-size: 11px;
  }
}
</style>
