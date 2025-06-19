<template>
  <div class="marketplace-container">
    <div class="marketplace-header">
      <div class="header-content">
        <div class="title-section">
          <h1>
            <Icon icon="mdi:store" class="title-icon" />
            Marketplace
          </h1>
          <p>Buy and sell items with other players</p>
        </div>
        <div class="header-stats">
          <div class="stat">
            <Icon icon="mdi:package-variant" />
            <span>{{ listings.length }} Active Listings</span>
          </div>
          <div class="stat">
            <Icon icon="mdi:handshake" />
            <span>{{ totalOffers }} Total Offers</span>
          </div>
        </div>
      </div>
      <button @click="showCreateListing = true" class="create-listing-btn">
        <Icon icon="mdi:plus" /> Create Listing
      </button>
    </div>

    <!-- Create Listing Modal -->
    <div v-if="showCreateListing" class="modal-overlay" @click="showCreateListing = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Create New Listing</h2>
          <button @click="showCreateListing = false" class="close-btn">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Item:</label>
            <ItemSelector
              v-model="newListing.itemId"
              :items="tradeableItems"
              placeholder="Choose an item to sell..."
              @change="updateSelectedItem"
            />
          </div>
          
          <div v-if="selectedItem" class="item-preview">
            <div class="item-preview-header">
              <ItemIcon 
                :item-id="selectedItem._id" 
                :item-name="selectedItem.name"
                size="large"
              />
              <div class="item-preview-info">
                <h3>{{ selectedItem.name }}</h3>
                <p>{{ selectedItem.description }}</p>
                <p class="base-cost">Base cost: {{ selectedItem.cost }} coins</p>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Quantity:</label>
            <input type="number" v-model="newListing.quantity" min="1" placeholder="1">
          </div>

          <div class="form-group">
            <label>Asking Price (coins):</label>
            <input type="number" v-model="newListing.askingPrice" min="1" placeholder="Enter price">
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="newListing.acceptsItems">
              Accept item trades of equivalent value
            </label>
          </div>

          <div class="form-group">
            <label>Additional Notes (optional):</label>
            <textarea v-model="newListing.notes" placeholder="Any additional information..."></textarea>
          </div>

          <div class="modal-actions">
            <button @click="showCreateListing = false" class="cancel-btn">Cancel</button>
            <button @click="createListing" class="submit-btn" :disabled="!canCreateListing">
              Create Listing
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filters-header">
        <h3>
          <Icon icon="mdi:tune" />
          Filters & Search
        </h3>
        <button @click="clearFilters" class="clear-filters-btn" v-if="hasActiveFilters">
          <Icon icon="mdi:filter-off" />
          Clear All
        </button>
      </div>
      
      <div class="filters-grid">
        <!-- Search -->
        <div class="filter-card search-card">
          <div class="filter-label">
            <Icon icon="mdi:magnify" />
            <span>Search Items</span>
          </div>
          <div class="search-input-container">
            <Icon icon="mdi:magnify" class="search-icon" />
            <input 
              v-model="searchQuery" 
              placeholder="Search by name, description..." 
              class="enhanced-search-input"
            >
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''"
              class="clear-search-btn"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>
        </div>

        <!-- Sort -->
        <div class="filter-card sort-card">
          <div class="filter-label">
            <Icon icon="mdi:sort" />
            <span>Sort By</span>
          </div>
          <div class="sort-options">
            <button 
              v-for="option in sortOptions" 
              :key="option.value"
              @click="sortBy = option.value"
              :class="['sort-option', { active: sortBy === option.value }]"
            >
              <Icon :icon="option.icon" />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <!-- Price Range -->
        <div class="filter-card price-card">
          <div class="filter-label">
            <Icon icon="mdi:cash-multiple" />
            <span>Price Range</span>
          </div>
          <div class="price-range-container">
            <div class="price-input-group">
              <label>Min</label>
              <input 
                type="number" 
                v-model="priceFilter.min" 
                placeholder="0" 
                class="price-input"
                min="0"
              >
            </div>
            <div class="price-separator">
              <Icon icon="mdi:minus" />
            </div>
            <div class="price-input-group">
              <label>Max</label>
              <input 
                type="number" 
                v-model="priceFilter.max" 
                placeholder="∞" 
                class="price-input"
                min="0"
              >
            </div>
          </div>
        </div>

        <!-- Additional Filters -->
        <div class="filter-card options-card">
          <div class="filter-label">
            <Icon icon="mdi:filter-variant" />
            <span>Options</span>
          </div>
          <div class="filter-options">
            <label class="enhanced-checkbox">
              <input type="checkbox" v-model="showOnlyTradeableItems">
              <span class="checkmark">
                <Icon icon="mdi:check" class="check-icon" />
              </span>
              <div class="checkbox-content">
                <Icon icon="mdi:swap-horizontal" />
                <span>Accepts item trades</span>
              </div>
            </label>
            <label class="enhanced-checkbox">
              <input type="checkbox" v-model="showOnlyOwnListings">
              <span class="checkmark">
                <Icon icon="mdi:check" class="check-icon" />
              </span>
              <div class="checkbox-content">
                <Icon icon="mdi:account" />
                <span>My listings only</span>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <!-- Active Filters Summary -->
      <div v-if="hasActiveFilters" class="active-filters">
        <span class="active-filters-label">Active filters:</span>
        <div class="filter-tags">
          <span v-if="searchQuery" class="filter-tag">
            <Icon icon="mdi:magnify" />
            Search: "{{ searchQuery }}"
            <button @click="searchQuery = ''" class="remove-tag">
              <Icon icon="mdi:close" />
            </button>
          </span>
          <span v-if="priceFilter.min !== null" class="filter-tag">
            <Icon icon="mdi:cash" />
            Min: {{ priceFilter.min }}
            <button @click="priceFilter.min = null" class="remove-tag">
              <Icon icon="mdi:close" />
            </button>
          </span>
          <span v-if="priceFilter.max !== null" class="filter-tag">
            <Icon icon="mdi:cash" />
            Max: {{ priceFilter.max }}
            <button @click="priceFilter.max = null" class="remove-tag">
              <Icon icon="mdi:close" />
            </button>
          </span>
          <span v-if="showOnlyTradeableItems" class="filter-tag">
            <Icon icon="mdi:swap-horizontal" />
            Accepts trades
            <button @click="showOnlyTradeableItems = false" class="remove-tag">
              <Icon icon="mdi:close" />
            </button>
          </span>
          <span v-if="showOnlyOwnListings" class="filter-tag">
            <Icon icon="mdi:account" />
            My listings
            <button @click="showOnlyOwnListings = false" class="remove-tag">
              <Icon icon="mdi:close" />
            </button>
          </span>
        </div>
      </div>
    </div>

    <!-- Listings -->
    <div class="listings-section">
      <div class="section-header">
        <h3>
          <Icon icon="mdi:view-grid" />
          Active Listings ({{ filteredListings.length }})
        </h3>
        <div class="view-toggle">
          <button 
            @click="viewMode = 'grid'" 
            :class="{ active: viewMode === 'grid' }"
            class="view-btn"
          >
            <Icon icon="mdi:view-grid" />
          </button>
          <button 
            @click="viewMode = 'list'" 
            :class="{ active: viewMode === 'list' }"
            class="view-btn"
          >
            <Icon icon="mdi:view-list" />
          </button>
        </div>
      </div>
      
      <div v-if="filteredListings.length === 0" class="empty-state">
        <Icon icon="mdi:package-variant-closed" class="empty-icon" />
        <h3>No listings found</h3>
        <p>Try adjusting your filters or be the first to create a listing!</p>
        <button @click="showCreateListing = true" class="empty-action-btn">
          <Icon icon="mdi:plus" /> Create First Listing
        </button>
      </div>

      <div :class="['listings-grid', viewMode]">
        <div v-for="listing in filteredListings" :key="listing.id" class="listing-card" :class="{ 'own-listing': isOwnListing(listing) }">
          <div class="listing-badge" v-if="isOwnListing(listing)">
            <Icon icon="mdi:account" />
            Your Listing
          </div>
          
          <div class="listing-header">
            <div class="item-info">
              <div class="item-icon-container">
                <ItemIcon 
                  :item-id="listing.itemId" 
                  :item-name="getItemName(listing.itemId)"
                  size="medium"
                />
              </div>
              <div class="item-details">
                <h3>{{ getItemName(listing.itemId) }}</h3>
                <p class="quantity">
                  <Icon icon="mdi:counter" />
                  {{ listing.quantity }}x
                </p>
              </div>
            </div>
            <div class="listing-meta">
              <div class="seller-info">
                <Icon icon="mdi:account-circle" />
                <span class="seller">{{ listing.sellerName }}</span>
              </div>
              <span class="date">{{ formatDate(listing.createdAt) }}</span>
            </div>
          </div>
          
          <div class="listing-body">
            <div class="item-description">
              <Icon icon="mdi:information-outline" />
              {{ getItemDescription(listing.itemId) }}
            </div>
            
            <div class="price-section">
              <div class="asking-price">
                <Icon icon="mdi:coin" />
                <span class="price-amount">{{ listing.askingPrice }}</span>
                <span class="price-label">coins</span>
              </div>
              <div v-if="listing.acceptsItems" class="accepts-trades">
                <Icon icon="mdi:swap-horizontal" />
                <span>Accepts trades</span>
              </div>
            </div>

            <div v-if="listing.notes" class="notes">
              <Icon icon="mdi:note-text" />
              <div class="notes-content">
                <strong>Seller Notes:</strong> {{ listing.notes }}
              </div>
            </div>
          </div>

          <div class="listing-actions">
            <button v-if="!isOwnListing(listing)" @click="showMakeOffer(listing)" class="offer-btn">
              <Icon icon="mdi:handshake" />
              Make Offer
            </button>
            <button v-if="isOwnListing(listing)" @click="viewOffers(listing)" class="view-offers-btn">
              <Icon icon="mdi:email" />
              Offers ({{ getOfferCount(listing.id) }})
            </button>
            <button v-if="isOwnListing(listing)" @click="removeListing(listing.id)" class="remove-btn">
              <Icon icon="mdi:delete" />
              Remove
            </button>
          </div>

        <!-- Offers for this listing -->
        <div v-if="listing.showOffers && isOwnListing(listing)" class="offers-section">
          <h4>Offers:</h4>
          <div v-if="getOffersForListing(listing.id).length === 0" class="no-offers">
            No offers yet.
          </div>
          <div v-for="offer in getOffersForListing(listing.id)" :key="offer.id" class="offer-card">
            <div class="offer-header">
              <span class="buyer">{{ offer.buyerName }}</span>
              <span class="offer-date">{{ formatDate(offer.createdAt) }}</span>
            </div>
            <div class="offer-details">
              <div v-if="offer.coinOffer" class="coin-offer">
                <Icon icon="mdi:coin" />
                {{ offer.coinOffer }} coins
              </div>
              <div v-if="offer.itemOffers.length > 0" class="item-offers">
                <Icon icon="mdi:package-variant" />
                <span>Items:</span>
                <div class="offered-items">
                  <div v-for="(itemOffer, index) in offer.itemOffers" :key="index" class="offered-item">
                    <ItemIcon 
                      :item-id="itemOffer.itemId" 
                      :item-name="getItemName(itemOffer.itemId)"
                      size="small"
                    />
                    <span>{{ itemOffer.quantity }}x {{ getItemName(itemOffer.itemId) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="offer.message" class="offer-message">
                <strong>Message:</strong> {{ offer.message }}
              </div>
            </div>
            <div class="offer-actions">
              <button @click="acceptOffer(listing, offer)" class="accept-btn">Accept</button>
              <button @click="rejectOffer(offer.id)" class="reject-btn">Reject</button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Make Offer Modal -->
    <div v-if="showOfferModal" class="modal-overlay" @click="showOfferModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Make Offer</h2>
          <button @click="showOfferModal = false" class="close-btn">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="modal-body">
          <div class="listing-summary">
            <div class="listing-summary-header">
              <ItemIcon 
                v-if="selectedListing"
                :item-id="selectedListing.itemId" 
                :item-name="getItemName(selectedListing.itemId)"
                size="large"
              />
              <div class="listing-summary-info">
                <h3>{{ getItemName(selectedListing?.itemId) }}</h3>
                <p>Quantity: {{ selectedListing?.quantity }}</p>
                <p>Asking Price: {{ selectedListing?.askingPrice }} coins</p>
                <p v-if="selectedListing?.acceptsItems">✓ Accepts item trades</p>
              </div>
            </div>
          </div>

          <div class="offer-type-selector">
            <label>
              <input type="radio" v-model="newOffer.offerType" value="coins">
              Coin Offer
            </label>
            <label v-if="selectedListing?.acceptsItems">
              <input type="radio" v-model="newOffer.offerType" value="items">
              Item Offer
            </label>
            <label v-if="selectedListing?.acceptsItems">
              <input type="radio" v-model="newOffer.offerType" value="mixed">
              Mixed Offer (Coins + Items)
            </label>
          </div>

          <div v-if="newOffer.offerType === 'coins' || newOffer.offerType === 'mixed'" class="form-group">
            <label>Coin Offer:</label>
            <input type="number" v-model="newOffer.coinOffer" min="0" placeholder="Enter coin amount">
          </div>

          <div v-if="newOffer.offerType === 'items' || newOffer.offerType === 'mixed'" class="item-offers-section">
            <label>Item Offers:</label>
            <div v-for="(itemOffer, index) in newOffer.itemOffers" :key="index" class="item-offer-row">
              <div class="item-offer-selector">
                <ItemSelector
                  v-model="itemOffer.itemId"
                  :items="tradeableItems"
                  placeholder="Select item to offer..."
                />
              </div>
              <input type="number" v-model="itemOffer.quantity" min="1" placeholder="Qty">
              <button @click="removeItemOffer(index)" class="remove-item-btn">
                <Icon icon="mdi:minus" />
              </button>
            </div>
            <button @click="addItemOffer" class="add-item-btn">
              <Icon icon="mdi:plus" /> Add Item
            </button>
          </div>

          <div class="form-group">
            <label>Message (optional):</label>
            <textarea v-model="newOffer.message" placeholder="Add a message to your offer..."></textarea>
          </div>

          <div class="offer-value-summary" v-if="calculateOfferValue() > 0">
            <strong>Total Offer Value: {{ calculateOfferValue() }} coins</strong>
          </div>

          <div class="modal-actions">
            <button @click="showOfferModal = false" class="cancel-btn">Cancel</button>
            <button @click="submitOffer" class="submit-btn" :disabled="!canSubmitOffer">
              Submit Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import ItemIcon from '@/components/ItemIcon.vue'
import ItemSelector from '@/components/ItemSelector.vue'
import itemDefs from '@/assets/itemInformation/itemdefs.json'

// Types
interface Item {
  _id: number
  name: string
  description: string
  cost: number
  isTradeable: boolean
}

interface MarketplaceListing {
  id: string
  itemId: number
  quantity: number
  askingPrice: number
  acceptsItems: boolean
  notes: string
  sellerName: string
  sellerId: string
  createdAt: Date
  showOffers?: boolean
}

interface ItemOffer {
  itemId: number
  quantity: number
}

interface Offer {
  id: string
  listingId: string
  buyerName: string
  buyerId: string
  coinOffer: number
  itemOffers: ItemOffer[]
  message: string
  createdAt: Date
  status: 'pending' | 'accepted' | 'rejected'
}

interface NewListing {
  itemId: number | string
  quantity: number
  askingPrice: number
  acceptsItems: boolean
  notes: string
}

interface NewOffer {
  offerType: 'coins' | 'items' | 'mixed'
  coinOffer: number
  itemOffers: ItemOffer[]
  message: string
}

// Reactive data
const listings = ref<MarketplaceListing[]>([])
const offers = ref<Offer[]>([])
const showCreateListing = ref(false)
const showOfferModal = ref(false)
const selectedListing = ref<MarketplaceListing | null>(null)
const currentUser = ref({ id: 'user1', name: 'Player' }) // Mock user
const searchQuery = ref('')
const sortBy = ref('newest')
const showOnlyTradeableItems = ref(false)
const showOnlyOwnListings = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const priceFilter = ref({ min: null as number | null, max: null as number | null })

// Sort options for the enhanced UI
const sortOptions = [
  { value: 'newest', label: 'Newest', icon: 'mdi:clock-outline' },
  { value: 'oldest', label: 'Oldest', icon: 'mdi:clock' },
  { value: 'price-low', label: 'Price ↑', icon: 'mdi:sort-numeric-ascending' },
  { value: 'price-high', label: 'Price ↓', icon: 'mdi:sort-numeric-descending' },
  { value: 'item-name', label: 'Name', icon: 'mdi:sort-alphabetical-ascending' }
]

// Form data
const newListing = ref<NewListing>({
  itemId: '',
  quantity: 1,
  askingPrice: 0,
  acceptsItems: false,
  notes: ''
})

const newOffer = ref<NewOffer>({
  offerType: 'coins',
  coinOffer: 0,
  itemOffers: [],
  message: ''
})

// Computed properties
const tradeableItems = computed(() => {
  return (itemDefs as Item[]).filter(item => item.isTradeable)
})

const totalOffers = computed(() => {
  return offers.value.filter(offer => offer.status === 'pending').length
})

const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' ||
         priceFilter.value.min !== null ||
         priceFilter.value.max !== null ||
         showOnlyTradeableItems.value ||
         showOnlyOwnListings.value
})

const selectedItem = computed(() => {
  if (!newListing.value.itemId) return null
  return tradeableItems.value.find(item => item._id === Number(newListing.value.itemId))
})

const canCreateListing = computed(() => {
  return newListing.value.itemId && 
         newListing.value.quantity > 0 && 
         newListing.value.askingPrice > 0
})

const canSubmitOffer = computed(() => {
  const hasValidCoinOffer = newOffer.value.offerType === 'coins' && newOffer.value.coinOffer > 0
  const hasValidItemOffer = (newOffer.value.offerType === 'items' || newOffer.value.offerType === 'mixed') && 
                           newOffer.value.itemOffers.some(offer => offer.itemId && offer.quantity > 0)
  const hasValidMixedOffer = newOffer.value.offerType === 'mixed' && 
                            (newOffer.value.coinOffer > 0 || newOffer.value.itemOffers.some(offer => offer.itemId && offer.quantity > 0))
  
  return hasValidCoinOffer || hasValidItemOffer || hasValidMixedOffer
})

const filteredListings = computed(() => {
  let filtered = [...listings.value]
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(listing => {
      const item = getItem(listing.itemId)
      return item?.name.toLowerCase().includes(query) || 
             item?.description.toLowerCase().includes(query) ||
             listing.notes.toLowerCase().includes(query)
    })
  }
  
  // Price filter
  if (priceFilter.value.min !== null) {
    filtered = filtered.filter(listing => listing.askingPrice >= priceFilter.value.min!)
  }
  if (priceFilter.value.max !== null) {
    filtered = filtered.filter(listing => listing.askingPrice <= priceFilter.value.max!)
  }
  
  // Tradeable items filter
  if (showOnlyTradeableItems.value) {
    filtered = filtered.filter(listing => listing.acceptsItems)
  }
  
  // Own listings filter
  if (showOnlyOwnListings.value) {
    filtered = filtered.filter(listing => listing.sellerId === currentUser.value.id)
  }
  
  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'price-low':
        return a.askingPrice - b.askingPrice
      case 'price-high':
        return b.askingPrice - a.askingPrice
      case 'item-name':
        const itemA = getItem(a.itemId)
        const itemB = getItem(b.itemId)
        return (itemA?.name || '').localeCompare(itemB?.name || '')
      default:
        return 0
    }
  })
  
  return filtered
})

// Methods
const getItem = (itemId: number): Item | undefined => {
  return (itemDefs as Item[]).find(item => item._id === itemId)
}

const getItemName = (itemId: number): string => {
  return getItem(itemId)?.name || 'Unknown Item'
}

const getItemDescription = (itemId: number): string => {
  return getItem(itemId)?.description || 'No description available'
}

const updateSelectedItem = (item: Item | null) => {
  if (item) {
    newListing.value.askingPrice = item.cost
  }
}

const createListing = () => {
  if (!canCreateListing.value) return
  
  const listing: MarketplaceListing = {
    id: Date.now().toString(),
    itemId: Number(newListing.value.itemId),
    quantity: newListing.value.quantity,
    askingPrice: newListing.value.askingPrice,
    acceptsItems: newListing.value.acceptsItems,
    notes: newListing.value.notes,
    sellerName: currentUser.value.name,
    sellerId: currentUser.value.id,
    createdAt: new Date()
  }
  
  listings.value.push(listing)
  
  // Reset form
  newListing.value = {
    itemId: '',
    quantity: 1,
    askingPrice: 0,
    acceptsItems: false,
    notes: ''
  }
  
  showCreateListing.value = false
}

const isOwnListing = (listing: MarketplaceListing): boolean => {
  return listing.sellerId === currentUser.value.id
}

const showMakeOffer = (listing: MarketplaceListing) => {
  selectedListing.value = listing
  newOffer.value = {
    offerType: 'coins',
    coinOffer: 0,
    itemOffers: [],
    message: ''
  }
  showOfferModal.value = true
}

const addItemOffer = () => {
  newOffer.value.itemOffers.push({ itemId: 0, quantity: 1 })
}

const removeItemOffer = (index: number) => {
  newOffer.value.itemOffers.splice(index, 1)
}

const calculateOfferValue = (): number => {
  let total = newOffer.value.coinOffer || 0
  
  newOffer.value.itemOffers.forEach(itemOffer => {
    const item = getItem(itemOffer.itemId)
    if (item) {
      total += item.cost * itemOffer.quantity
    }
  })
  
  return total
}

const submitOffer = () => {
  if (!canSubmitOffer.value || !selectedListing.value) return
  
  const offer: Offer = {
    id: Date.now().toString(),
    listingId: selectedListing.value.id,
    buyerName: currentUser.value.name,
    buyerId: currentUser.value.id,
    coinOffer: newOffer.value.coinOffer || 0,
    itemOffers: newOffer.value.itemOffers.filter(offer => offer.itemId && offer.quantity > 0),
    message: newOffer.value.message,
    createdAt: new Date(),
    status: 'pending'
  }
  
  offers.value.push(offer)
  showOfferModal.value = false
  selectedListing.value = null
}

const viewOffers = (listing: MarketplaceListing) => {
  const index = listings.value.findIndex(l => l.id === listing.id)
  if (index !== -1) {
    listings.value[index].showOffers = !listings.value[index].showOffers
  }
}

const getOffersForListing = (listingId: string): Offer[] => {
  return offers.value.filter(offer => offer.listingId === listingId && offer.status === 'pending')
}

const getOfferCount = (listingId: string): number => {
  return getOffersForListing(listingId).length
}

const acceptOffer = (listing: MarketplaceListing, offer: Offer) => {
  // Mark offer as accepted
  const offerIndex = offers.value.findIndex(o => o.id === offer.id)
  if (offerIndex !== -1) {
    offers.value[offerIndex].status = 'accepted'
  }
  
  // Remove the listing
  removeListing(listing.id)
  
  // In a real app, this would trigger the actual trade
  alert(`Offer accepted! Trade completed with ${offer.buyerName}.`)
}

const rejectOffer = (offerId: string) => {
  const offerIndex = offers.value.findIndex(o => o.id === offerId)
  if (offerIndex !== -1) {
    offers.value[offerIndex].status = 'rejected'
  }
}

const removeListing = (listingId: string) => {
  const index = listings.value.findIndex(l => l.id === listingId)
  if (index !== -1) {
    listings.value.splice(index, 1)
  }
}

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const clearFilters = () => {
  searchQuery.value = ''
  priceFilter.value.min = null
  priceFilter.value.max = null
  showOnlyTradeableItems.value = false
  showOnlyOwnListings.value = false
  sortBy.value = 'newest'
}

// Initialize with some sample data
onMounted(() => {
  // Add some sample listings for demonstration
  listings.value = [
    {
      id: '1',
      itemId: 2, // raw bass
      quantity: 5,
      askingPrice: 30,
      acceptsItems: true,
      notes: 'Fresh caught this morning! Perfect for cooking training.',
      sellerName: 'FishermanJoe',
      sellerId: 'seller1',
      createdAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: '2',
      itemId: 3, // bass
      quantity: 3,
      askingPrice: 25,
      acceptsItems: false,
      notes: 'Perfectly cooked bass, ready to eat. Great for healing!',
      sellerName: 'ChefMarie',
      sellerId: 'seller2',
      createdAt: new Date(Date.now() - 3600000) // 1 hour ago
    },
    {
      id: '3',
      itemId: 4, // raw bluegill
      quantity: 10,
      askingPrice: 80,
      acceptsItems: true,
      notes: 'Bulk sale! Perfect for skill training.',
      sellerName: 'BulkTrader',
      sellerId: 'seller3',
      createdAt: new Date(Date.now() - 7200000) // 2 hours ago
    },
    {
      id: '4',
      itemId: 2, // raw bass
      quantity: 1,
      askingPrice: 8,
      acceptsItems: true,
      notes: '',
      sellerName: 'QuickSeller',
      sellerId: 'seller4',
      createdAt: new Date(Date.now() - 1800000) // 30 minutes ago
    }
  ]
  
  // Add some sample offers
  offers.value = [
    {
      id: 'offer1',
      listingId: '1',
      buyerName: 'CookingMaster',
      buyerId: 'buyer1',
      coinOffer: 28,
      itemOffers: [],
      message: 'Would you take 28 coins? I need these for cooking training.',
      createdAt: new Date(Date.now() - 1800000),
      status: 'pending'
    },
    {
      id: 'offer2',
      listingId: '1',
      buyerName: 'ItemTrader',
      buyerId: 'buyer2',
      coinOffer: 0,
      itemOffers: [{ itemId: 3, quantity: 4 }],
      message: 'I have 4 cooked bass to trade!',
      createdAt: new Date(Date.now() - 900000),
      status: 'pending'
    }
  ]
})
</script>

<style scoped>
.marketplace-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--theme-text-primary);
}

.marketplace-header {
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.title-section h1 {
  color: var(--theme-accent);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 2.5rem;
}

.title-icon {
  font-size: 2.5rem;
}

.title-section p {
  color: var(--theme-text-secondary);
  margin: 0;
  font-size: 1.1rem;
}

.header-stats {
  display: flex;
  gap: 2rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-text-secondary);
  font-size: 0.95rem;
  padding: 0.5rem 1rem;
  background-color: var(--theme-background);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.create-listing-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-accent-dark) 100%);
  color: var(--theme-text-dark);
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px var(--theme-accent-transparent-30);
}

.create-listing-btn:hover {
  background: linear-gradient(135deg, var(--theme-accent-light) 0%, var(--theme-accent) 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--theme-accent-transparent-40);
}

.filters-section {
  margin-bottom: 2rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filters-header h3 {
  color: var(--theme-accent);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
}

.clear-filters-btn {
  background-color: var(--theme-background-mute);
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.clear-filters-btn:hover {
  background-color: var(--theme-background-light);
  color: var(--theme-text-primary);
  border-color: var(--theme-accent-transparent-40);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-card {
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.filter-card:hover {
  border-color: var(--theme-accent-transparent-30);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-accent);
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

/* Search Card */
.search-input-container {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--theme-text-secondary);
  font-size: 1.1rem;
  z-index: 1;
}

.enhanced-search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background-color: var(--theme-background);
  color: var(--theme-text-primary);
  font-size: 16px;
  transition: all 0.3s ease;
}

.enhanced-search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-accent-transparent-20);
}

.enhanced-search-input::placeholder {
  color: var(--theme-text-muted);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--theme-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.clear-search-btn:hover {
  background-color: var(--theme-background-mute);
  color: var(--theme-text-primary);
}

/* Sort Card */
.sort-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 12px;
  background-color: var(--theme-background);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  color: var(--theme-text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.sort-option:hover {
  background-color: var(--theme-background-light);
  color: var(--theme-text-primary);
  border-color: var(--theme-accent-transparent-40);
}

.sort-option.active {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  border-color: var(--theme-accent);
  font-weight: 600;
}

/* Price Card */
.price-range-container {
  display: flex;
  align-items: end;
  gap: 1rem;
}

.price-input-group {
  flex: 1;
}

.price-input-group label {
  display: block;
  color: var(--theme-text-secondary);
  font-size: 14px;
  margin-bottom: 0.5rem;
}

.price-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  background-color: var(--theme-background);
  color: var(--theme-text-primary);
  font-size: 16px;
  transition: all 0.3s ease;
}

.price-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-accent-transparent-20);
}

.price-separator {
  display: flex;
  align-items: center;
  color: var(--theme-text-secondary);
  font-size: 1.2rem;
  margin-bottom: 8px;
}

/* Options Card */
.filter-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.enhanced-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.enhanced-checkbox:hover {
  background-color: var(--theme-background);
}

.enhanced-checkbox input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--theme-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background-color: var(--theme-background);
}

.enhanced-checkbox input[type="checkbox"]:checked + .checkmark {
  background-color: var(--theme-accent);
  border-color: var(--theme-accent);
}

.check-icon {
  color: var(--theme-text-dark);
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.enhanced-checkbox input[type="checkbox"]:checked + .checkmark .check-icon {
  opacity: 1;
}

.checkbox-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 14px;
}

/* Active Filters */
.active-filters {
  background-color: var(--theme-background);
  border: 1px solid var(--theme-accent-transparent-30);
  border-radius: 8px;
  padding: 1rem;
}

.active-filters-label {
  color: var(--theme-accent);
  font-weight: 600;
  margin-bottom: 0.75rem;
  display: block;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--theme-accent-transparent-20);
  color: var(--theme-text-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid var(--theme-accent-transparent-40);
}

.remove-tag {
  background: none;
  border: none;
  color: var(--theme-text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  transition: all 0.3s ease;
  margin-left: 0.25rem;
}

.remove-tag:hover {
  background-color: var(--theme-accent-transparent-30);
  color: var(--theme-text-primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--theme-background-soft);
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--theme-border);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--theme-border);
}

.modal-header h2 {
  color: var(--theme-accent);
}

.close-btn {
  background: none;
  border: none;
  color: var(--theme-text-secondary);
  cursor: pointer;
  font-size: 24px;
  padding: 4px;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: var(--theme-text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--theme-text-primary);
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  background-color: var(--theme-background-mute);
  color: var(--theme-text-primary);
  font-size: 16px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-accent-transparent-20);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.item-preview {
  background-color: var(--theme-background-mute);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid var(--theme-border);
}

.item-preview-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.item-preview-info {
  flex: 1;
}

.item-preview-info h3 {
  color: var(--theme-accent);
  margin-bottom: 0.5rem;
}

.base-cost {
  color: var(--theme-text-secondary);
  font-style: italic;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn,
.submit-btn {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background-color: transparent;
  border: 1px solid var(--theme-border);
  color: var(--theme-text-secondary);
}

.cancel-btn:hover {
  background-color: var(--theme-background-mute);
  color: var(--theme-text-primary);
}

.submit-btn {
  background-color: var(--theme-accent);
  border: none;
  color: var(--theme-text-dark);
  font-weight: 600;
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--theme-accent-dark);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.listings-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  color: var(--theme-accent);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.view-btn {
  padding: 8px;
  background-color: var(--theme-background-soft);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  color: var(--theme-text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-btn:hover {
  color: var(--theme-text-primary);
  border-color: var(--theme-accent-transparent-40);
}

.view-btn.active {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  border-color: var(--theme-accent);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--theme-text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: var(--theme-text-muted);
}

.empty-state h3 {
  color: var(--theme-text-primary);
  margin-bottom: 0.5rem;
}

.empty-action-btn {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.empty-action-btn:hover {
  background-color: var(--theme-accent-dark);
}

.listings-grid {
  display: grid;
  gap: 1.5rem;
}

.listings-grid.grid {
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}

.listings-grid.list {
  grid-template-columns: 1fr;
}

.listings-grid.list .listing-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
}

.listings-grid.list .listing-header {
  margin-bottom: 0;
}

.listings-grid.list .listing-body {
  margin-bottom: 0;
}

.listings-grid.list .listing-actions {
  justify-self: end;
}

.listing-card {
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.listing-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--theme-accent) 0%, var(--theme-accent-light) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.listing-card:hover::before {
  opacity: 1;
}

.listing-card:hover {
  border-color: var(--theme-accent-transparent-40);
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.listing-card.own-listing {
  border-color: var(--theme-accent-transparent-30);
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-accent-transparent-10) 100%);
}

.listing-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.listing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.item-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: linear-gradient(135deg, var(--theme-accent-transparent-10) 0%, var(--theme-accent-transparent-20) 100%);
  border-radius: 8px;
  min-width: 60px;
  min-height: 60px;
  border: 1px solid var(--theme-accent-transparent-30);
}

.item-details h3 {
  color: var(--theme-accent);
  margin-bottom: 0.25rem;
  font-size: 1.2rem;
}

.quantity {
  color: var(--theme-text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
}

.listing-meta {
  text-align: right;
  font-size: 12px;
  color: var(--theme-text-muted);
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
  justify-content: flex-end;
}

.seller {
  color: var(--theme-text-secondary);
}

.listing-body {
  margin-bottom: 1.5rem;
}

.item-description {
  color: var(--theme-text-secondary);
  margin-bottom: 1.5rem;
  font-style: italic;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--theme-background);
  border-radius: 8px;
  border-left: 3px solid var(--theme-accent-transparent-40);
}

.price-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.asking-price {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.25rem;
  color: var(--theme-accent);
}

.price-amount {
  font-size: 1.5rem;
}

.price-label {
  font-size: 1rem;
  color: var(--theme-text-secondary);
}

.accepts-trades {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-text-secondary);
  font-size: 14px;
  background-color: var(--theme-accent-transparent-10);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--theme-accent-transparent-20);
}

.notes {
  background-color: var(--theme-background);
  padding: 1rem;
  border-radius: 8px;
  font-size: 14px;
  border-left: 3px solid var(--theme-accent);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.notes-content {
  flex: 1;
}

.listing-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.offer-btn,
.view-offers-btn,
.remove-btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.offer-btn {
  background: linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-accent-dark) 100%);
  color: var(--theme-text-dark);
  font-weight: 600;
  box-shadow: 0 2px 8px var(--theme-accent-transparent-30);
}

.offer-btn:hover {
  background: linear-gradient(135deg, var(--theme-accent-light) 0%, var(--theme-accent) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--theme-accent-transparent-40);
}

.view-offers-btn {
  background-color: var(--theme-background-mute);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border);
}

.view-offers-btn:hover {
  background-color: var(--theme-background-light);
  border-color: var(--theme-accent-transparent-40);
  transform: translateY(-1px);
}

.remove-btn {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.remove-btn:hover {
  background: linear-gradient(135deg, #e74c3c 0%, #dc3545 100%);
  transform: translateY(-1px);
}

.offers-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--theme-border);
}

.offers-section h4 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.no-offers {
  color: var(--theme-text-muted);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

.offer-card {
  background-color: var(--theme-background-mute);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.offer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.buyer {
  font-weight: 600;
  color: var(--theme-text-primary);
}

.offer-date {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.offer-details {
  margin-bottom: 1rem;
}

.coin-offer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--theme-accent);
  font-weight: 600;
}

.item-offers {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-direction: column;
}

.offered-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-left: 1.5rem;
}

.offered-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--theme-background) 0%, var(--theme-background-mute) 100%);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--theme-border);
  font-size: 0.9rem;
}

.coin-offer {
  color: var(--theme-accent);
  font-weight: 600;
}

.offer-message {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background-color: var(--theme-background);
  border-radius: 4px;
  font-size: 14px;
}

.offer-actions {
  display: flex;
  gap: 0.5rem;
}

.accept-btn,
.reject-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.accept-btn {
  background-color: #28a745;
  color: white;
}

.accept-btn:hover {
  background-color: #218838;
}

.reject-btn {
  background-color: #6c757d;
  color: white;
}

.reject-btn:hover {
  background-color: #5a6268;
}

.listing-summary {
  background-color: var(--theme-background-mute);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--theme-border);
}

.listing-summary-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.listing-summary-info {
  flex: 1;
}

.listing-summary-info h3 {
  color: var(--theme-accent);
  margin-bottom: 0.5rem;
}

.offer-type-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.offer-type-selector label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.item-offer-selector {
  flex: 1;
}

.item-offers-section {
  margin-bottom: 1.5rem;
}

.item-offer-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.item-offer-row input {
  width: 80px;
}

.remove-item-btn,
.add-item-btn {
  padding: 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 14px;
  transition: all 0.3s ease;
}

.remove-item-btn {
  background-color: #dc3545;
  color: white;
}

.remove-item-btn:hover {
  background-color: #c82333;
}

.add-item-btn {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  margin-top: 0.5rem;
}

.add-item-btn:hover {
  background-color: var(--theme-accent-dark);
}

.offer-value-summary {
  background-color: var(--theme-background-mute);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  color: var(--theme-accent);
  margin-bottom: 1.5rem;
  border: 1px solid var(--theme-accent-transparent-30);
}

/* Responsive design */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  
  .header-stats {
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .marketplace-container {
    padding: 1rem;
  }
  
  .marketplace-header {
    flex-direction: column;
    text-align: center;
  }
  
  .title-section h1 {
    font-size: 2rem;
  }
  
  .header-stats {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  
  .stat {
    justify-content: center;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .filter-card {
    padding: 1rem;
  }
  
  .filters-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .sort-options {
    justify-content: center;
  }
  
  .price-range-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .price-separator {
    transform: rotate(90deg);
    margin: 0;
  }
  
  .filter-tags {
    justify-content: center;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .view-toggle {
    justify-content: center;
  }
  
  .listings-grid.grid {
    grid-template-columns: 1fr;
  }
  
  .listings-grid.list .listing-card {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .listings-grid.list .listing-actions {
    justify-self: stretch;
  }
  
  .listing-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .listing-meta {
    text-align: left;
  }
  
  .seller-info {
    justify-content: flex-start;
  }
  
  .price-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .item-offer-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .item-offer-row input {
    width: 100%;
  }
  
  .modal {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .listing-actions {
    flex-direction: column;
  }
}
</style>
