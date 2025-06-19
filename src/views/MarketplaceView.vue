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
          <div class="stat" :class="{ pulse: listings.length > 0 }">
            <Icon icon="mdi:package-variant" />
            <span>{{ listings.length }} Active Listings</span>
          </div>
          <div class="stat" :class="{ pulse: totalOffers > 0 }">
            <Icon icon="mdi:handshake" />
            <span>{{ totalOffers }} Total Offers</span>
          </div>
          <div class="stat">
            <Icon icon="mdi:clock-outline" />
            <span>{{ getTimeOfDay() }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button @click="showCreateListing = true" class="create-listing-btn">
          <Icon icon="mdi:plus" /> Create Listing
        </button>
        <button @click="refreshListings" class="refresh-btn" :class="{ spinning: isRefreshing }">
          <Icon icon="mdi:refresh" />
        </button>
      </div>
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
          <span v-if="filteredListings.length !== listings.length" class="filter-indicator">
            of {{ listings.length }} total
          </span>
        </h3>
        <div class="view-controls">
          <div class="view-toggle">
            <button 
              @click="viewMode = 'grid'" 
              :class="{ active: viewMode === 'grid' }"
              class="view-btn"
              title="Grid View"
            >
              <Icon icon="mdi:view-grid" />
            </button>
            <button 
              @click="viewMode = 'list'" 
              :class="{ active: viewMode === 'list' }"
              class="view-btn"
              title="List View"
            >
              <Icon icon="mdi:view-list" />
            </button>
          </div>
          <button @click="toggleQuickFilters" class="quick-filters-btn" :class="{ active: showQuickFilters }">
            <Icon icon="mdi:tune-vertical" />
            Quick Filters
          </button>
        </div>
      </div>
      
      <!-- Quick Filters Bar -->
      <div v-if="showQuickFilters" class="quick-filters-bar" @click.stop>
        <div class="quick-filter-chips">
          <button 
            v-for="chip in quickFilterChips" 
            :key="chip.key"
            @click="applyQuickFilter(chip)"
            :class="['filter-chip', { active: isQuickFilterActive(chip) }]"
          >
            <Icon :icon="chip.icon" />
            {{ chip.label }}
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
        <TransitionGroup name="listing" tag="div" class="listings-container">
          <div v-for="listing in filteredListings" :key="listing.id" 
               :data-listing-id="listing.id"
               class="listing-card" 
               :class="{ 'own-listing': isOwnListing(listing) }">
            <div class="listing-badge" v-if="isOwnListing(listing)">
              <Icon icon="mdi:account" />
              Your Listing
            </div>
            
            <!-- Listing Popularity Indicator -->
            <div v-if="getOfferCount(listing.id) > 0" class="popularity-badge">
              <Icon icon="mdi:fire" />
              {{ getOfferCount(listing.id) }} offer{{ getOfferCount(listing.id) !== 1 ? 's' : '' }}
            </div>
            
            <div class="listing-header">
              <div class="item-info">
                <div class="item-icon-container" @click="showItemDetails(listing.itemId)">
                  <ItemIcon 
                    :item-id="listing.itemId" 
                    :item-name="getItemName(listing.itemId)"
                    size="medium"
                  />
                  <div class="icon-overlay">
                    <Icon icon="mdi:magnify" />
                  </div>
                </div>
                <div class="item-details">
                  <h3>{{ getItemName(listing.itemId) }}</h3>
                  <p class="quantity">
                    <Icon icon="mdi:counter" />
                    {{ listing.quantity }}x
                  </p>
                  <div class="listing-age">
                    <Icon icon="mdi:clock-outline" />
                    {{ getRelativeTime(listing.createdAt) }}
                  </div>
                </div>
              </div>
              <div class="listing-meta">
                <div class="seller-info" @click="showSellerProfile(listing.sellerId)">
                  <Icon icon="mdi:account-circle" />
                  <span class="seller">{{ listing.sellerName }}</span>
                  <Icon icon="mdi:chevron-right" class="profile-arrow" />
                </div>
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
              <button v-if="!isOwnListing(listing)" @click="quickBuy(listing)" class="quick-buy-btn" :disabled="!canQuickBuy(listing)">
                <Icon icon="mdi:flash" />
                Quick Buy
              </button>
              <button v-if="isOwnListing(listing)" @click="viewOffers(listing)" class="view-offers-btn">
                <Icon icon="mdi:email" />
                Offers ({{ getOfferCount(listing.id) }})
              </button>
              <button @click="addToWatchlist(listing)" :class="['watchlist-btn', { active: isInWatchlist(listing.id) }]">
                <Icon :icon="isInWatchlist(listing.id) ? 'mdi:heart' : 'mdi:heart-outline'" />
                {{ isInWatchlist(listing.id) ? 'Watching' : 'Watch' }}
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
        </TransitionGroup>
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

    <!-- Item Details Modal -->
    <div v-if="showItemDetailModal" class="modal-overlay" @click="showItemDetailModal = false">
      <div class="modal item-details-modal" @click.stop>
        <div class="modal-header">
          <h2>Item Details</h2>
          <button @click="showItemDetailModal = false" class="close-btn">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="modal-body" v-if="selectedItemForDetails">
          <div class="item-detail-content">
            <div class="item-detail-header">
              <ItemIcon 
                :item-id="selectedItemForDetails" 
                :item-name="getItemName(selectedItemForDetails)"
                size="large"
              />
              <div class="item-detail-info">
                <h3>{{ getItemName(selectedItemForDetails) }}</h3>
                <p class="item-detail-description">{{ getItemDescription(selectedItemForDetails) }}</p>
                <div class="item-stats">
                  <div class="stat-item">
                    <Icon icon="mdi:cash" />
                    <span>Base Cost: {{ getItem(selectedItemForDetails)?.cost }} coins</span>
                  </div>
                  <div class="stat-item">
                    <Icon icon="mdi:swap-horizontal" />
                    <span>{{ getItem(selectedItemForDetails)?.isTradeable ? 'Tradeable' : 'Not Tradeable' }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="market-stats">
              <h4>Market Statistics</h4>
              <div class="market-stats-grid">
                <div class="market-stat">
                  <Icon icon="mdi:chart-line" />
                  <div>
                    <span class="stat-label">Active Listings</span>
                    <span class="stat-value">{{ getMarketStats(selectedItemForDetails).activeListings }}</span>
                  </div>
                </div>
                <div class="market-stat">
                  <Icon icon="mdi:trending-up" />
                  <div>
                    <span class="stat-label">Avg. Price</span>
                    <span class="stat-value">{{ getMarketStats(selectedItemForDetails).avgPrice }} coins</span>
                  </div>
                </div>
                <div class="market-stat">
                  <Icon icon="mdi:arrow-up-down" />
                  <div>
                    <span class="stat-label">Price Range</span>
                    <span class="stat-value">{{ getMarketStats(selectedItemForDetails).priceRange }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Seller Profile Modal -->
    <div v-if="showSellerProfileModal" class="modal-overlay" @click="showSellerProfileModal = false">
      <div class="modal seller-profile-modal" @click.stop>
        <div class="modal-header">
          <h2>Seller Profile</h2>
          <button @click="showSellerProfileModal = false" class="close-btn">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="modal-body" v-if="selectedSellerForProfile">
          <div class="seller-profile-content">
            <div class="seller-profile-header">
              <div class="seller-avatar">
                <Icon icon="mdi:account-circle" />
              </div>
              <div class="seller-profile-info">
                <h3>{{ getSellerName(selectedSellerForProfile) }}</h3>
                <div class="seller-badges">
                  <span class="badge verified">
                    <Icon icon="mdi:check-circle" />
                    Verified Trader
                  </span>
                  <span class="badge rating">
                    <Icon icon="mdi:star" />
                    4.8/5.0
                  </span>
                </div>
                <p class="seller-since">Trading since: {{ getSellerJoinDate(selectedSellerForProfile) }}</p>
              </div>
            </div>
            
            <div class="seller-stats">
              <h4>Trading Statistics</h4>
              <div class="seller-stats-grid">
                <div class="seller-stat">
                  <Icon icon="mdi:package-variant" />
                  <div>
                    <span class="stat-label">Total Sales</span>
                    <span class="stat-value">{{ getSellerStats(selectedSellerForProfile).totalSales }}</span>
                  </div>
                </div>
                <div class="seller-stat">
                  <Icon icon="mdi:clock-outline" />
                  <div>
                    <span class="stat-label">Avg. Response</span>
                    <span class="stat-value">{{ getSellerStats(selectedSellerForProfile).avgResponse }}</span>
                  </div>
                </div>
                <div class="seller-stat">
                  <Icon icon="mdi:thumbs-up" />
                  <div>
                    <span class="stat-label">Positive Rating</span>
                    <span class="stat-value">{{ getSellerStats(selectedSellerForProfile).positiveRating }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="seller-listings">
              <h4>Other Listings by {{ getSellerName(selectedSellerForProfile) }}</h4>
              <div class="seller-listings-grid">
                <div 
                  v-for="listing in getSellerOtherListings(selectedSellerForProfile)" 
                  :key="listing.id"
                  class="mini-listing-card"
                  @click="showSellerProfileModal = false; document.querySelector(`[data-listing-id='${listing.id}']`)?.scrollIntoView({ behavior: 'smooth' })"
                >
                  <ItemIcon 
                    :item-id="listing.itemId" 
                    :item-name="getItemName(listing.itemId)"
                    size="small"
                  />
                  <div class="mini-listing-info">
                    <span class="mini-listing-name">{{ getItemName(listing.itemId) }}</span>
                    <span class="mini-listing-price">{{ listing.askingPrice }} coins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback Toast Messages -->
    <div class="feedback-container">
      <TransitionGroup name="feedback" tag="div">
        <div 
          v-for="(action, index) in recentActions" 
          :key="`${action}-${index}`"
          :class="['feedback-toast', getFeedbackType(action)]"
        >
          <Icon :icon="getFeedbackIcon(action)" />
          <span>{{ getFeedbackMessage(action) }}</span>
        </div>
      </TransitionGroup>
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

// New UX features
const showQuickFilters = ref(false)
const isRefreshing = ref(false)
const watchlist = ref<string[]>([]) // Array of listing IDs
const showItemDetailModal = ref(false)
const selectedItemForDetails = ref<number | null>(null)
const showSellerProfileModal = ref(false)
const selectedSellerForProfile = ref<string | null>(null)
const recentActions = ref<string[]>([]) // For feedback messages

// Quick filter chips data
const quickFilterChips = ref([
  { key: 'cheap', label: 'Under 20 coins', icon: 'mdi:currency-usd-off', filter: { priceMax: 20 } },
  { key: 'moderate', label: '20-50 coins', icon: 'mdi:currency-usd', filter: { priceMin: 20, priceMax: 50 } },
  { key: 'expensive', label: 'Over 50 coins', icon: 'mdi:diamond', filter: { priceMin: 50 } },
  { key: 'tradeable', label: 'Accepts trades', icon: 'mdi:swap-horizontal', filter: { acceptsTrades: true } },
  { key: 'fresh', label: 'Posted today', icon: 'mdi:new-box', filter: { isRecent: true } },
  { key: 'popular', label: 'Has offers', icon: 'mdi:fire', filter: { hasOffers: true } }
])

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

const getTimeOfDay = (): string => {
  const hour = new Date().getHours()
  if (hour < 6) return '🌙 Late Night'
  if (hour < 12) return '🌅 Morning'
  if (hour < 18) return '☀️ Afternoon'
  if (hour < 21) return '🌆 Evening'
  return '🌙 Night'
}

const getRelativeTime = (date: Date): string => {
  const now = new Date().getTime()
  const time = new Date(date).getTime()
  const diffInMinutes = Math.floor((now - time) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return formatDate(date)
}

const refreshListings = async () => {
  isRefreshing.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Add some randomness to demonstrate refresh
  if (Math.random() > 0.7) {
    const randomItem = tradeableItems.value[Math.floor(Math.random() * tradeableItems.value.length)]
    const newListing: MarketplaceListing = {
      id: Date.now().toString(),
      itemId: randomItem._id,
      quantity: Math.floor(Math.random() * 5) + 1,
      askingPrice: Math.floor(randomItem.cost * (0.8 + Math.random() * 0.4)),
      acceptsItems: Math.random() > 0.5,
      notes: 'Fresh listing!',
      sellerName: `Trader${Math.floor(Math.random() * 100)}`,
      sellerId: `seller${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date()
    }
    listings.value.unshift(newListing)
    showFeedback('New listings found!', 'success')
  }
  
  isRefreshing.value = false
}

const toggleQuickFilters = () => {
  showQuickFilters.value = !showQuickFilters.value
}

const applyQuickFilter = (chip: any) => {
  const filter = chip.filter
  
  if (filter.priceMin !== undefined) priceFilter.value.min = filter.priceMin
  if (filter.priceMax !== undefined) priceFilter.value.max = filter.priceMax
  if (filter.acceptsTrades) showOnlyTradeableItems.value = true
  if (filter.isRecent) {
    // Filter for listings posted in last 24 hours
    sortBy.value = 'newest'
  }
  if (filter.hasOffers) {
    // This would require additional filtering logic
    showFeedback('Showing popular listings with offers', 'info')
  }
  
  showQuickFilters.value = false
  showFeedback(`Applied filter: ${chip.label}`, 'info')
}

const isQuickFilterActive = (chip: any): boolean => {
  const filter = chip.filter
  
  if (filter.priceMin !== undefined && priceFilter.value.min !== filter.priceMin) return false
  if (filter.priceMax !== undefined && priceFilter.value.max !== filter.priceMax) return false
  if (filter.acceptsTrades && !showOnlyTradeableItems.value) return false
  
  return false // Simplified logic for demo
}

// Watchlist functionality
const addToWatchlist = (listing: MarketplaceListing) => {
  const listingId = listing.id
  if (isInWatchlist(listingId)) {
    watchlist.value = watchlist.value.filter(id => id !== listingId)
    showFeedback('Removed from watchlist', 'info')
  } else {
    watchlist.value.push(listingId)
    showFeedback('Added to watchlist', 'success')
  }
}

const isInWatchlist = (listingId: string): boolean => {
  return watchlist.value.includes(listingId)
}

// Quick buy functionality
const quickBuy = (listing: MarketplaceListing) => {
  if (!canQuickBuy(listing)) return
  
  // Simulate quick purchase
  showFeedback(`Quick-bought ${getItemName(listing.itemId)} for ${listing.askingPrice} coins!`, 'success')
  
  // Remove listing after purchase
  setTimeout(() => {
    removeListing(listing.id)
  }, 1500)
}

const canQuickBuy = (listing: MarketplaceListing): boolean => {
  // Simulate having enough coins (always true for demo)
  return !isOwnListing(listing)
}

// Item details modal
const showItemDetails = (itemId: number) => {
  selectedItemForDetails.value = itemId
  showItemDetailModal.value = true
}

// Seller profile modal
const showSellerProfile = (sellerId: string) => {
  selectedSellerForProfile.value = sellerId
  showSellerProfileModal.value = true
}

// Feedback system
const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  recentActions.value.unshift(`${type}:${message}`)
  
  // Remove after 3 seconds
  setTimeout(() => {
    recentActions.value = recentActions.value.filter(action => action !== `${type}:${message}`)
  }, 3000)
  
  // Keep only last 3 messages
  if (recentActions.value.length > 3) {
    recentActions.value = recentActions.value.slice(0, 3)
  }
}

const getFeedbackType = (action: string): string => {
  return action.split(':')[0]
}

const getFeedbackMessage = (action: string): string => {
  return action.split(':')[1]
}

const getFeedbackIcon = (action: string): string => {
  const type = action.split(':')[0]
  switch (type) {
    case 'success': return 'mdi:check-circle'
    case 'error': return 'mdi:alert-circle'
    case 'info': return 'mdi:information'
    default: return 'mdi:information'
  }
}

// Market statistics for item details
const getMarketStats = (itemId: number) => {
  const itemListings = listings.value.filter(l => l.itemId === itemId)
  const prices = itemListings.map(l => l.askingPrice)
  
  return {
    activeListings: itemListings.length,
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    priceRange: prices.length ? `${Math.min(...prices)} - ${Math.max(...prices)}` : 'N/A'
  }
}

// Seller profile functionality
const getSellerName = (sellerId: string): string => {
  const listing = listings.value.find(l => l.sellerId === sellerId)
  return listing?.sellerName || 'Unknown Seller'
}

const getSellerJoinDate = (sellerId: string): string => {
  // Mock data - in real app this would come from user profile
  const dates = ['Jan 2023', 'Mar 2023', 'Jun 2023', 'Sep 2023', 'Dec 2023']
  return dates[Math.floor(Math.random() * dates.length)]
}

const getSellerStats = (sellerId: string) => {
  // Mock data - in real app this would come from seller profile API
  return {
    totalSales: Math.floor(Math.random() * 100) + 50,
    avgResponse: ['2 min', '5 min', '10 min', '30 min'][Math.floor(Math.random() * 4)],
    positiveRating: 95 + Math.floor(Math.random() * 5)
  }
}

const getSellerOtherListings = (sellerId: string): MarketplaceListing[] => {
  return listings.value
    .filter(l => l.sellerId === sellerId)
    .slice(0, 4) // Show max 4 other listings
}

const clearFilters = () => {
  searchQuery.value = ''
  priceFilter.value.min = null
  priceFilter.value.max = null
  showOnlyTradeableItems.value = false
  showOnlyOwnListings.value = false
  sortBy.value = 'newest'
  showFeedback('All filters cleared', 'info')
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

/* Enhanced UX Features */

/* Refresh button animation */
.refresh-btn {
  background-color: var(--theme-background-mute);
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  background-color: var(--theme-background-light);
  color: var(--theme-text-primary);
  border-color: var(--theme-accent-transparent-40);
}

.refresh-btn.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Header stats pulse animation */
.stat.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* View controls */
.view-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quick-filters-btn {
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

.quick-filters-btn:hover,
.quick-filters-btn.active {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  border-color: var(--theme-accent);
}

/* Quick filters bar */
.quick-filters-bar {
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
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

.quick-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.filter-chip {
  background-color: var(--theme-background);
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
  padding: 8px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-weight: 500;
}

.filter-chip:hover {
  background-color: var(--theme-background-light);
  border-color: var(--theme-accent-transparent-40);
  transform: translateY(-1px);
}

.filter-chip.active {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  border-color: var(--theme-accent);
}

/* Listing enhancements */
.popularity-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
  animation: gentle-bounce 2s ease-in-out infinite;
}

@keyframes gentle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.listing-age {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--theme-text-muted);
  font-size: 12px;
  margin-top: 0.25rem;
}

.profile-arrow {
  transition: transform 0.3s ease;
}

.seller-info:hover .profile-arrow {
  transform: translateX(2px);
}

.seller-info {
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.seller-info:hover {
  background-color: var(--theme-background-light);
  color: var(--theme-accent);
}

.icon-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.item-icon-container {
  position: relative;
  cursor: pointer;
}

.item-icon-container:hover .icon-overlay {
  opacity: 1;
}

/* Enhanced action buttons */
.quick-buy-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
}

.quick-buy-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #32a852 0%, #24d4a3 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
}

.quick-buy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.watchlist-btn {
  background-color: var(--theme-background-mute);
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.watchlist-btn:hover {
  background-color: var(--theme-background-light);
  border-color: var(--theme-accent-transparent-40);
  transform: translateY(-1px);
}

.watchlist-btn.active {
  background: linear-gradient(135deg, #e91e63 0%, #f06292 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
}

.watchlist-btn.active:hover {
  background: linear-gradient(135deg, #f06292 0%, #e91e63 100%);
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.4);
}

/* Item Details Modal */
.item-details-modal {
  max-width: 700px;
}

.item-detail-content {
  padding: 0;
}

.item-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.item-detail-info {
  flex: 1;
}

.item-detail-info h3 {
  color: var(--theme-accent);
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}

.item-detail-description {
  color: var(--theme-text-secondary);
  margin-bottom: 1rem;
  font-style: italic;
  line-height: 1.5;
}

.item-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 14px;
}

.market-stats {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background-color: var(--theme-background);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.market-stats h4 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.market-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.market-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.market-stat > svg {
  color: var(--theme-accent);
  font-size: 1.5rem;
}

.stat-label {
  display: block;
  color: var(--theme-text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  display: block;
  color: var(--theme-text-primary);
  font-weight: 600;
  font-size: 16px;
}

/* Seller Profile Modal */
.seller-profile-modal {
  max-width: 600px;
}

.seller-profile-content {
  padding: 0;
}

.seller-profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.seller-avatar {
  font-size: 4rem;
  color: var(--theme-accent);
}

.seller-profile-info {
  flex: 1;
}

.seller-profile-info h3 {
  color: var(--theme-accent);
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}

.seller-badges {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge.verified {
  background-color: #28a745;
  color: white;
}

.badge.rating {
  background-color: #ffc107;
  color: #212529;
}

.seller-since {
  color: var(--theme-text-secondary);
  font-size: 14px;
  margin: 0;
}

.seller-stats {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--theme-background);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.seller-stats h4 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.seller-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.seller-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.seller-stat > svg {
  color: var(--theme-accent);
  font-size: 1.25rem;
}

.seller-listings {
  padding: 1.5rem;
  background-color: var(--theme-background);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
}

.seller-listings h4 {
  color: var(--theme-accent);
  margin-bottom: 1rem;
}

.seller-listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.mini-listing-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--theme-background-soft) 0%, var(--theme-background-mute) 100%);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mini-listing-card:hover {
  border-color: var(--theme-accent-transparent-40);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mini-listing-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mini-listing-name {
  color: var(--theme-text-primary);
  font-weight: 500;
  font-size: 14px;
}

.mini-listing-price {
  color: var(--theme-accent);
  font-weight: 600;
  font-size: 12px;
}

/* Feedback Toast System */
.feedback-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  pointer-events: none;
}

.feedback-toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  backdrop-filter: blur(10px);
}

.feedback-toast.success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.feedback-toast.error {
  background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
}

.feedback-toast.info {
  background: linear-gradient(135deg, #17a2b8 0%, #007bff 100%);
}

/* Feedback transition animations */
.feedback-enter-active,
.feedback-leave-active {
  transition: all 0.3s ease;
}

.feedback-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.feedback-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Listing transition animations */
.listing-enter-active,
.listing-leave-active {
  transition: all 0.5s ease;
}

.listing-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.listing-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.listing-move {
  transition: transform 0.5s ease;
}

/* Filter indicator */
.filter-indicator {
  color: var(--theme-text-muted);
  font-size: 0.9rem;
  font-weight: normal;
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
