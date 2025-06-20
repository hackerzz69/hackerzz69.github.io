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
          <div class="stat" :class="{ pulse: marketplace.listings.value.length > 0 }">
            <Icon icon="mdi:package-variant" />
            <span>{{ marketplace.listings.value.length }} Active Listings</span>
          </div>
          <div class="stat" :class="{ pulse: totalOffers > 0 }">
            <Icon icon="mdi:handshake" />
            <span>{{ totalOffers }} Total Offers</span>
          </div>
        </div>
      </div>        <div class="header-actions">
          <button v-if="authStore.isAuthenticated" @click="showCreateListing = true" class="btn btn-primary btn-lg">
            <Icon icon="mdi:plus" /> Create Listing
          </button>
          <button v-else @click="authStore.login" class="btn btn-primary btn-lg">
            <Icon icon="mdi:login" /> Login to Sell
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
            <button @click="showCreateListing = false" class="btn btn-ghost">Cancel</button>
            <button @click="createListing" class="btn btn-primary" :disabled="!canCreateListing">
              Create Listing
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="filters-bar">
      <!-- Search Input -->
      <div class="search-container">
        <Icon icon="mdi:magnify" class="search-icon" />
        <input 
          v-model="searchQuery" 
          placeholder="Search items..." 
          class="search-input"
        >
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''"
          class="clear-search-btn"
        >
          <Icon icon="mdi:close" />
        </button>
      </div>

      <!-- Sort Dropdown -->
      <div class="sort-container">
        <Icon icon="mdi:sort" class="sort-icon" />
        <select v-model="sortBy" class="sort-select">
          <option 
            v-for="option in sortOptions" 
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Price Range -->
      <div class="price-container">
        <Icon icon="mdi:cash-multiple" class="price-icon" />
        <input 
          type="number" 
          v-model="priceFilter.min" 
          placeholder="Min price" 
          class="price-input"
          min="0"
        >
        <span class="price-separator">-</span>
        <input 
          type="number" 
          v-model="priceFilter.max" 
          placeholder="Max price" 
          class="price-input"
          min="0"
        >
      </div>

      <!-- Filter Options -->
      <div class="filter-toggles">
        <button 
          @click="showOnlyTradeableItems = !showOnlyTradeableItems"
          :class="['toggle-btn', { active: showOnlyTradeableItems }]"
          title="Show only items that accept trades"
        >
          <Icon icon="mdi:swap-horizontal" />
          <span>Trades</span>
        </button>
        <button 
          @click="showOnlyOwnListings = !showOnlyOwnListings"
          :class="['toggle-btn', { active: showOnlyOwnListings }]"
          title="Show only my listings"
        >
          <Icon icon="mdi:account" />
          <span>Mine</span>
        </button>
      </div>

      <!-- Clear Filters -->
      <button 
        v-if="hasActiveFilters"
        @click="clearFilters" 
        class="clear-all-btn"
        title="Clear all filters"
      >
        <Icon icon="mdi:filter-off" />
        <span>Clear</span>
      </button>
    </div>

    <!-- Listings -->
    <div class="listings-section">
      <div class="section-header">          <h3>
            <Icon icon="mdi:view-grid" />
            Active Listings ({{ filteredListings.length }})
            <span v-if="filteredListings.length !== marketplace.listings.value.length" class="filter-indicator">
              of {{ marketplace.listings.value.length }} total
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

      <!-- Pending Trades Section -->
      <div v-if="authStore.isAuthenticated && marketplace.pendingTrades.value.length > 0" class="pending-trades-section">
        <div class="section-header">
          <h3>
            <Icon icon="mdi:clock-outline" />
            Pending Trades ({{ marketplace.pendingTrades.value.length }})
          </h3>
        </div>
        <div class="pending-trades-grid">
          <div v-for="trade in marketplace.pendingTrades.value" :key="trade.id" class="pending-trade-card">
            <div class="trade-header">
              <div class="trade-status">
                <Icon icon="mdi:handshake" />
                <span>{{ trade.user_role === 'seller' ? 'Selling' : 'Buying' }}</span>
              </div>
              <div class="trade-confirmations">
                <div :class="['confirmation-badge', { confirmed: trade.seller_confirmed }]">
                  <Icon :icon="trade.seller_confirmed ? 'mdi:check' : 'mdi:clock-outline'" />
                  Seller
                </div>
                <div :class="['confirmation-badge', { confirmed: trade.buyer_confirmed }]">
                  <Icon :icon="trade.buyer_confirmed ? 'mdi:check' : 'mdi:clock-outline'" />
                  Buyer
                </div>
              </div>
            </div>
            
            <div class="trade-details">
              <div class="trade-item">
                <ItemIcon 
                  :item-id="trade.item_id" 
                  :item-name="getItemName(trade.item_id)"
                  size="medium"
                />
                <div class="trade-item-info">
                  <h4>{{ getItemName(trade.item_id) }}</h4>
                  <p>{{ trade.quantity }}x - {{ trade.asking_price }} coins</p>
                </div>
              </div>
              
              <div class="trade-offer">
                <div v-if="trade.coin_offer > 0" class="coin-offer">
                  <Icon icon="mdi:coin" />
                  <span>{{ trade.coin_offer }} coins</span>
                </div>
                <div v-if="trade.item_offers && trade.item_offers.length > 0" class="item-offers">
                  <div v-for="itemOffer in trade.item_offers" :key="itemOffer.id" class="offered-item">
                    <ItemIcon 
                      :item-id="itemOffer.item_id" 
                      :item-name="getItemName(itemOffer.item_id)"
                      size="small"
                    />
                    <span>{{ itemOffer.quantity }}x {{ getItemName(itemOffer.item_id) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="trade-parties">
                <div class="party seller">
                  <Icon icon="mdi:account" />
                  <span>{{ trade.seller_name }}</span>
                </div>
                <Icon icon="mdi:arrow-right" />
                <div class="party buyer">
                  <Icon icon="mdi:account-outline" />
                  <span>{{ trade.buyer_name }}</span>
                </div>
              </div>
            </div>
            
            <div class="trade-actions">
              <div v-if="!trade.seller_confirmed && !trade.buyer_confirmed" class="trade-warning">
                <Icon icon="mdi:information" />
                <span>Both parties need to confirm the trade completion. You can cancel this trade until someone confirms.</span>
              </div>
              <div v-else-if="trade.seller_confirmed && trade.buyer_confirmed" class="trade-completed">
                <Icon icon="mdi:check-circle" />
                <span>Trade completed!</span>
              </div>
              <div v-else class="trade-waiting">
                <Icon icon="mdi:clock-outline" />
                <span v-if="trade.user_role === 'seller' && trade.seller_confirmed">
                  Waiting for buyer to confirm
                </span>
                <span v-else-if="trade.user_role === 'buyer' && trade.buyer_confirmed">
                  Waiting for seller to confirm
                </span>
                <span v-else>
                  Please confirm when the trade is complete
                </span>
              </div>
              
              <div class="trade-buttons">
                <button 
                  v-if="(trade.user_role === 'seller' && !trade.seller_confirmed) || (trade.user_role === 'buyer' && !trade.buyer_confirmed)"
                  @click="confirmTrade(trade.id)"
                  class="btn btn-success"
                >
                  <Icon icon="mdi:check" />
                  Confirm Trade
                </button>
                <button 
                  v-if="!trade.seller_confirmed && !trade.buyer_confirmed"
                  @click="cancelTrade(trade.id)"
                  class="btn btn-danger btn-sm"
                  title="Cancel this trade and return the listing to active status"
                >
                  <Icon icon="mdi:close" />
                  Cancel Trade
                </button>
              </div>
            </div>
            
            <div class="trade-meta">
              <span class="trade-date">{{ getRelativeTime(trade.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="filteredListings.length === 0" class="empty-state">
        <Icon icon="mdi:package-variant-closed" class="empty-icon" />
        <h3>No listings found</h3>
        <p>Try adjusting your filters or be the first to create a listing!</p>
        <button v-if="authStore.isAuthenticated" @click="showCreateListing = true" class="btn btn-primary btn-spaced">
          <Icon icon="mdi:plus" /> Create First Listing
        </button>
        <button v-else @click="authStore.login" class="btn btn-primary btn-spaced">
          <Icon icon="mdi:login" /> Login to Create Listing
        </button>
      </div>

      <TransitionGroup name="listing" tag="div" :class="['listings-grid', viewMode]">
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
            
            <div class="listing-header">            <div class="item-info">
              <div class="item-icon-container" @click="showItemDetails(listing.item_id)">
                <ItemIcon 
                  :item-id="listing.item_id" 
                  :item-name="getItemName(listing.item_id)"
                  size="medium"
                />
                <div class="icon-overlay">
                  <Icon icon="mdi:magnify" />
                </div>
              </div>
              <div class="item-details">
                <h3>{{ getItemName(listing.item_id) }}</h3>
                <p class="quantity">
                  <Icon icon="mdi:counter" />
                  {{ listing.quantity }}x
                </p>
                <div class="listing-age">
                  <Icon icon="mdi:clock-outline" />
                  {{ getRelativeTime(listing.created_at) }}
                </div>
              </div>
            </div>
            <div class="listing-meta">
              <div class="seller-info" @click="showSellerProfile(listing.seller_discord_id)">
                <div class="seller-avatar">
                  <img 
                    :src="marketplace.getDiscordAvatarUrl(listing.seller_discord_id, listing.seller_avatar)" 
                    :alt="`${listing.seller_name}'s avatar`"
                    @error="(e) => (e.target as HTMLImageElement).src = marketplace.getDiscordAvatarUrl(listing.seller_discord_id)"
                  />
                </div>
                <span class="seller">{{ marketplace.formatDiscordUsername(listing.seller_name, listing.seller_discriminator) }}</span>
                <Icon icon="mdi:chevron-right" class="profile-arrow" />
              </div>
            </div>
            </div>
          
          <div class="listing-body">
            <div class="price-section">
              <div class="asking-price">
                <Icon icon="mdi:coin" />
                <span class="price-amount">{{ listing.asking_price }}</span>
                <span class="price-label">coins</span>
              </div>
              <div v-if="listing.accepts_items" class="accepts-trades">
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
              <button 
                v-if="!isOwnListing(listing)" 
                @click="showMakeOffer(listing)" 
                class="btn btn-primary"
              >
                <Icon icon="mdi:handshake" />
                Make Offer
              </button>
              <button @click="viewOffers(listing)" class="btn btn-secondary">
                <Icon icon="mdi:eye" />
                View Offers ({{ getOfferCount(listing.id) }})
              </button>
              <button v-if="isOwnListing(listing)" @click="removeListing(listing.id)" class="btn btn-danger">
                <Icon icon="mdi:delete" />
                Remove
              </button>
            </div>
          </div>
        </TransitionGroup>
    </div>

    <!-- View Offers Modal -->
    <div v-if="showOffersModal" class="modal-overlay" @click="showOffersModal = false">
      <div class="modal offers-modal" @click.stop>
        <div class="modal-header">
          <h2>Offers for {{ selectedListingForOffers?.seller_name }}'s {{ getItemName(selectedListingForOffers?.item_id || 0) }}</h2>
          <button @click="showOffersModal = false" class="close-btn">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="modal-body" v-if="selectedListingForOffers">
          <div class="listing-summary">
            <div class="listing-item">
              <ItemIcon 
                :item-id="selectedListingForOffers.item_id" 
                :item-name="getItemName(selectedListingForOffers.item_id)"
                size="medium"
              />
              <div class="listing-details">
                <h3>{{ getItemName(selectedListingForOffers.item_id) }}</h3>
                <p>Quantity: {{ selectedListingForOffers.quantity }}</p>
                <p class="price">{{ selectedListingForOffers.asking_price }} coins</p>
                <p v-if="selectedListingForOffers.accepts_items" class="accepts-trades">
                  <Icon icon="mdi:swap-horizontal" /> Accepts item trades
                </p>
              </div>
            </div>
          </div>

          <div class="offers-list">
            <h3>All Offers ({{ getOffersForListing(selectedListingForOffers.id).length }})</h3>
            <div v-if="getOffersForListing(selectedListingForOffers.id).length === 0" class="no-offers">
              <Icon icon="mdi:email-outline" />
              <p>No offers yet for this listing.</p>
              <p class="no-offers-subtitle">Be the first to make an offer!</p>
            </div>
            <div v-for="offer in getOffersForListing(selectedListingForOffers.id)" :key="offer.id" class="offer-card-modal">
              <div class="offer-header">
                <div class="buyer-info">
                  <div class="buyer-avatar">
                    <img 
                      :src="marketplace.getDiscordAvatarUrl(offer.buyer_discord_id, offer.buyer_avatar)" 
                      :alt="`${offer.buyer_name}'s avatar`"
                      @error="(e) => (e.target as HTMLImageElement).src = marketplace.getDiscordAvatarUrl(offer.buyer_discord_id)"
                    />
                  </div>
                  <div class="buyer-details">
                    <span class="buyer-name">{{ marketplace.formatDiscordUsername(offer.buyer_name, offer.buyer_discriminator) }}</span>
                    <span class="offer-date">{{ formatDate(offer.created_at) }}</span>
                  </div>
                </div>
                <div class="offer-value">
                  <Icon icon="mdi:tag" />
                  <span class="total-value">Total Value</span>
                </div>
              </div>
              
              <div class="offer-content">
                <div v-if="offer.coin_offer" class="coin-offer">
                  <Icon icon="mdi:coin" />
                  <span>{{ offer.coin_offer }} coins</span>
                </div>
                <div v-if="offer.item_offers && offer.item_offers.length > 0" class="item-offers">
                  <Icon icon="mdi:package-variant" />
                  <span class="items-label">Items offered:</span>
                  <div class="offered-items">
                    <div v-for="(itemOffer, index) in offer.item_offers" :key="index" class="offered-item">
                      <ItemIcon 
                        :item-id="itemOffer.item_id" 
                        :item-name="getItemName(itemOffer.item_id)"
                        size="small"
                      />
                      <span class="item-details">{{ itemOffer.quantity }}x {{ getItemName(itemOffer.item_id) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="offer.message" class="offer-message">
                  <Icon icon="mdi:message-text" />
                  <div class="message-content">
                    <strong>Buyer's message:</strong>
                    <p>{{ offer.message }}</p>
                  </div>
                </div>
              </div>

              <div v-if="isOwnListing(selectedListingForOffers)" class="offer-actions">
                <button @click="acceptOffer(selectedListingForOffers, offer)" class="btn btn-success btn-sm">
                  <Icon icon="mdi:check" />
                  Accept Offer
                </button>
                <button @click="rejectOffer(offer.id, selectedListingForOffers.id)" class="btn btn-ghost btn-sm">
                  <Icon icon="mdi:close" />
                  Reject
                </button>
              </div>
              <div v-else class="offer-viewer-info">
                <Icon icon="mdi:information" />
                <span class="offer-viewer-note">Only the seller can accept or reject offers</span>
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
                :item-id="selectedListing.item_id" 
                :item-name="getItemName(selectedListing.item_id)"
                size="large"
              />
              <div class="listing-summary-info">
                <h3>{{ selectedListing?.item_id ? getItemName(selectedListing.item_id) : 'Unknown Item' }}</h3>
                <p>Quantity: {{ selectedListing?.quantity }}</p>
                <p>Asking Price: {{ selectedListing?.asking_price }} coins</p>
                <p v-if="selectedListing?.accepts_items">✓ Accepts item trades</p>
              </div>
            </div>
          </div>

          <div class="offer-type-selector">
            <label>
              <input type="radio" v-model="newOffer.offerType" value="coins">
              Coin Offer
            </label>
            <label v-if="selectedListing?.accepts_items">
              <input type="radio" v-model="newOffer.offerType" value="items">
              Item Offer
            </label>
            <label v-if="selectedListing?.accepts_items">
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
                  v-model="itemOffer.item_id"
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
        <div class="modal-body" v-if="selectedSellerProfile">
          <div class="seller-profile-content">
            <div class="seller-profile-header">
              <div class="seller-avatar">
                <img 
                  :src="marketplace.getDiscordAvatarUrl(selectedSellerProfile.discord_id, selectedSellerProfile.avatar)" 
                  :alt="`${selectedSellerProfile.username}'s avatar`"
                  @error="(e) => (e.target as HTMLImageElement).src = marketplace.getDiscordAvatarUrl(selectedSellerProfile.discord_id)"
                />
              </div>
              <div class="seller-profile-info">
                <h3>{{ marketplace.formatDiscordUsername(selectedSellerProfile.username, selectedSellerProfile.discriminator) }}</h3>
                <div class="seller-badges">
                  <span class="badge verified">
                    <Icon icon="mdi:check-circle" />
                    HighLite Verified
                  </span>
                </div>
                <p class="seller-since">Trading since: {{ formatJoinDate(selectedSellerProfile.joined_date) }}</p>
              </div>
            </div>
            
            <div class="seller-stats">
              <h4>Trading Statistics</h4>
              <div class="seller-stats-grid">
                <div class="seller-stat">
                  <Icon icon="mdi:package-variant" />
                  <div>
                    <span class="stat-label">Total Listings</span>
                    <span class="stat-value">{{ selectedSellerProfile.stats.total_listings }}</span>
                  </div>
                </div>
                <div class="seller-stat">
                  <Icon icon="mdi:handshake" />
                  <div>
                    <span class="stat-label">Sales Completed</span>
                    <span class="stat-value">{{ selectedSellerProfile.stats.total_sales }}</span>
                  </div>
                </div>
                <div class="seller-stat">
                  <Icon icon="mdi:chart-line" />
                  <div>
                    <span class="stat-label">Success Rate</span>
                    <span class="stat-value">{{ selectedSellerProfile.stats.success_rate }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="seller-listings" v-if="selectedSellerProfile.listings.length > 0">
              <h4>Other Listings by {{ selectedSellerProfile.username }}</h4>
              <div class="seller-listings-grid">
                <div 
                  v-for="listing in selectedSellerProfile.listings" 
                  :key="listing.id"
                  class="mini-listing-card"
                  @click="scrollToListing(listing.id.toString())"
                >
                  <ItemIcon 
                    :item-id="listing.item_id" 
                    :item-name="getItemName(listing.item_id)"
                    size="small"
                  />
                  <div class="mini-listing-info">
                    <span class="mini-listing-name">{{ getItemName(listing.item_id) }}</span>
                    <span class="mini-listing-price">{{ listing.asking_price }} coins</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="seller-recent-trades" v-if="selectedSellerProfile.recent_trades.length > 0">
              <h4>Recent Completed Trades</h4>
              <div class="recent-trades-list">
                <div 
                  v-for="trade in selectedSellerProfile.recent_trades" 
                  :key="`${trade.item_id}-${trade.sold_date}`"
                  class="recent-trade-item"
                >
                  <ItemIcon 
                    :item-id="trade.item_id" 
                    :item-name="getItemName(trade.item_id)"
                    size="small"
                  />
                  <div class="trade-info">
                    <span class="trade-item">{{ getItemName(trade.item_id) }} (x{{ trade.quantity }})</span>
                    <span class="trade-price">{{ trade.asking_price }} coins</span>
                    <span class="trade-date">{{ formatTradeDate(trade.sold_date) }}</span>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import ItemIcon from '@/components/marketplace/ItemIcon.vue'
import ItemSelector from '@/components/marketplace/ItemSelector.vue'
import itemDefs from '@/assets/marketplace/itemdefs.json'
import { useMarketplace, type MarketplaceListing, type ItemOffer } from '@/composables/useMarketplace'
import { useAuthStore } from '@/stores/auth'

// Types
interface Item {
  _id: number
  name: string
  description: string
  cost: number
  isTradeable: boolean
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

// Composables
const marketplace = useMarketplace()
const authStore = useAuthStore()
const route = useRoute()

// Reactive data
const showCreateListing = ref(false)
const showOfferModal = ref(false)
const selectedListing = ref<MarketplaceListing | null>(null)
const searchQuery = ref('')
const sortBy = ref('newest')
const showOnlyTradeableItems = ref(false)
const showOnlyOwnListings = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const priceFilter = ref({ min: null as number | null, max: null as number | null })

// New UX features
const showQuickFilters = ref(false)
const showItemDetailModal = ref(false)
const selectedItemForDetails = ref<number | null>(null)
const showSellerProfileModal = ref(false)
const selectedSellerProfile = ref<any | null>(null)
const showOffersModal = ref(false)
const selectedListingForOffers = ref<MarketplaceListing | null>(null)
const recentActions = ref<string[]>([]) // For feedback messages

// Offers data
const listingOffers = ref<{ [listingId: string]: any[] }>({})

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
  return Object.values(listingOffers.value).reduce((total, offers) => total + offers.length, 0)
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
         newListing.value.askingPrice > 0 &&
         authStore.isAuthenticated
})

const canSubmitOffer = computed(() => {
  if (!authStore.isAuthenticated) return false
  
  const hasValidCoinOffer = newOffer.value.offerType === 'coins' && newOffer.value.coinOffer > 0
  const hasValidItemOffer = (newOffer.value.offerType === 'items' || newOffer.value.offerType === 'mixed') && 
                           newOffer.value.itemOffers.some(offer => offer.item_id && offer.quantity > 0)
  const hasValidMixedOffer = newOffer.value.offerType === 'mixed' && 
                            (newOffer.value.coinOffer > 0 || newOffer.value.itemOffers.some(offer => offer.item_id && offer.quantity > 0))
  
  return hasValidCoinOffer || hasValidItemOffer || hasValidMixedOffer
})

const filteredListings = computed(() => {
  let filtered = [...marketplace.listings.value]
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(listing => {
      const item = getItem(listing.item_id)
      return item?.name.toLowerCase().includes(query) || 
             item?.description.toLowerCase().includes(query) ||
             listing.notes.toLowerCase().includes(query)
    })
  }
  
  // Price filter
  if (priceFilter.value.min !== null) {
    filtered = filtered.filter(listing => listing.asking_price >= priceFilter.value.min!)
  }
  if (priceFilter.value.max !== null) {
    filtered = filtered.filter(listing => listing.asking_price <= priceFilter.value.max!)
  }
  
  // Tradeable items filter
  if (showOnlyTradeableItems.value) {
    filtered = filtered.filter(listing => listing.accepts_items)
  }
  
  // Own listings filter
  if (showOnlyOwnListings.value) {
    filtered = filtered.filter(listing => marketplace.isOwnListing(listing))
  }
  
  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'price-low':
        return a.asking_price - b.asking_price
      case 'price-high':
        return b.asking_price - a.asking_price
      case 'item-name':
        const itemA = getItem(a.item_id)
        const itemB = getItem(b.item_id)
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
  const item = getItem(itemId)
  if (!item) return 'Unknown Item'
  
  // Capitalize each word in the item name
  return item.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const getItemDescription = (itemId: number): string => {
  return getItem(itemId)?.description || 'No description available'
}

const updateSelectedItem = (item: Item | null) => {
  if (item) {
    newListing.value.askingPrice = item.cost
  }
}

const createListing = async () => {
  if (!canCreateListing.value) return
  
  try {
    await marketplace.createListing({
      itemId: Number(newListing.value.itemId),
      quantity: newListing.value.quantity,
      askingPrice: newListing.value.askingPrice,
      acceptsItems: newListing.value.acceptsItems,
      notes: newListing.value.notes
    })
    
    // Reset form
    newListing.value = {
      itemId: '',
      quantity: 1,
      askingPrice: 0,
      acceptsItems: false,
      notes: ''
    }
    
    showCreateListing.value = false
    showFeedback('Listing created successfully!', 'success')
  } catch (error) {
    showFeedback('Failed to create listing', 'error')
  }
}

const isOwnListing = (listing: MarketplaceListing): boolean => {
  return marketplace.isOwnListing(listing)
}

const showMakeOffer = (listing: MarketplaceListing) => {
  if (!authStore.isAuthenticated) {
    showFeedback('Please log in to make offers', 'error')
    return
  }
  
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
  newOffer.value.itemOffers.push({ item_id: 0, quantity: 1 })
}

const removeItemOffer = (index: number) => {
  newOffer.value.itemOffers.splice(index, 1)
}

const calculateOfferValue = (): number => {
  let total = newOffer.value.coinOffer || 0
  
  newOffer.value.itemOffers.forEach(itemOffer => {
    const item = getItem(itemOffer.item_id)
    if (item) {
      total += item.cost * itemOffer.quantity
    }
  })
  
  return total
}

const submitOffer = async () => {
  if (!canSubmitOffer.value || !selectedListing.value) return
  
  try {
    await marketplace.createOffer(selectedListing.value.id, {
      coinOffer: newOffer.value.coinOffer || 0,
      itemOffers: newOffer.value.itemOffers.filter(offer => offer.item_id && offer.quantity > 0).map(offer => ({
        item_id: offer.item_id,
        quantity: offer.quantity
      })),
      message: newOffer.value.message
    })
    
    // Refresh listings to update offer counts
    await marketplace.fetchListings()
    
    showOfferModal.value = false
    selectedListing.value = null
    showFeedback('Offer submitted successfully!', 'success')
  } catch (error) {
    showFeedback('Failed to submit offer', 'error')
  }
}

const viewOffers = async (listing: MarketplaceListing) => {
  try {
    const offers = await marketplace.fetchOffersForListing(listing.id)
    listingOffers.value[listing.id] = offers
    
    selectedListingForOffers.value = listing
    showOffersModal.value = true
  } catch (error) {
    showFeedback('Failed to load offers', 'error')
  }
}

const getOffersForListing = (listingId: string): any[] => {
  return listingOffers.value[listingId] || []
}

const getOfferCount = (listingId: string): number => {
  // First check if we have a listing with the offer_count from backend
  const listing = marketplace.listings.value.find(l => l.id === listingId)
  if (listing && typeof listing.offer_count === 'number') {
    return listing.offer_count
  }
  // Fallback to loaded offers count
  return getOffersForListing(listingId).length
}

const acceptOffer = async (_listing: MarketplaceListing, offer: any) => {
  try {
    await marketplace.acceptOffer(offer.id)
    
    // Close the offers modal
    showOffersModal.value = false
    selectedListingForOffers.value = null
    
    showFeedback(`Offer accepted! Trade is now pending verification from both parties.`, 'success')
    
    // Show additional guidance
    setTimeout(() => {
      showFeedback('Please confirm the trade once you have completed the exchange.', 'info')
    }, 2000)
  } catch (error) {
    showFeedback('Failed to accept offer', 'error')
  }
}

const confirmTrade = async (tradeConfirmationId: string) => {
  try {
    const result = await marketplace.confirmTrade(tradeConfirmationId)
    
    if (result.status === 'completed') {
      showFeedback('Trade completed successfully! Both parties have confirmed.', 'success')
    } else {
      showFeedback(result.message, 'info')
    }
  } catch (error) {
    showFeedback('Failed to confirm trade', 'error')
  }
}

const cancelTrade = async (tradeConfirmationId: string) => {
  if (!confirm('Are you sure you want to cancel this trade? The listing will become active again.')) {
    return
  }
  
  try {
    await marketplace.cancelTrade(tradeConfirmationId)
    showFeedback('Trade cancelled. Listing is now active again.', 'info')
  } catch (error) {
    showFeedback('Failed to cancel trade', 'error')
  }
}

const rejectOffer = async (offerId: string, listingId: string) => {
  try {
    await marketplace.rejectOffer(offerId)
    
    // Refresh offers for this listing
    const offers = await marketplace.fetchOffersForListing(listingId)
    listingOffers.value[listingId] = offers
    
    // Refresh listings to update offer counts
    await marketplace.fetchListings()
    
    showFeedback('Offer rejected', 'info')
  } catch (error) {
    showFeedback('Failed to reject offer', 'error')
  }
}

const removeListing = async (listingId: string) => {
  try {
    await marketplace.deleteListing(listingId)
    
    showFeedback('Listing removed successfully', 'success')
  } catch (error) {
    showFeedback('Failed to remove listing', 'error')
  }
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getRelativeTime = (date: string): string => {
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

// Item details modal
const showItemDetails = (itemId: number) => {
  selectedItemForDetails.value = itemId
  showItemDetailModal.value = true
}

// Seller profile modal
const showSellerProfile = async (sellerId: string) => {
  try {
    const profile = await marketplace.fetchSellerProfile(sellerId)
    if (profile) {
      selectedSellerProfile.value = profile
      showSellerProfileModal.value = true
    } else {
      showFeedback('Failed to load seller profile', 'error')
    }
  } catch (error) {
    console.error('Error loading seller profile:', error)
    showFeedback('Failed to load seller profile', 'error')
  }
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
  const itemListings = marketplace.listings.value.filter(l => l.item_id === itemId)
  const prices = itemListings.map(l => l.asking_price)
  
  return {
    activeListings: itemListings.length,
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    priceRange: prices.length ? `${Math.min(...prices)} - ${Math.max(...prices)}` : 'N/A'
  }
}

// Date formatting functions
const formatJoinDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const formatTradeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

// Initialize
onMounted(async () => {
  await marketplace.fetchListings()
  
  // Fetch pending trades if user is authenticated
  if (authStore.isAuthenticated) {
    await marketplace.fetchPendingTrades()
  }
  
  // Check for listing query parameter and scroll to it
  const listingId = route.query.listing as string
  if (listingId) {
    await nextTick() // Wait for DOM to update
    scrollToListing(listingId)
  }
})

// Function to scroll to and highlight a specific listing
const scrollToListing = (listingId: string) => {
  const element = document.querySelector(`[data-listing-id='${listingId}']`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Add a temporary highlight effect
    element.classList.add('highlighted-listing')
    setTimeout(() => {
      element.classList.remove('highlighted-listing')
    }, 3000)
  }
}
</script>
<style scoped>
    @import url('@/assets/marketplace/marketplace.css');
</style>