import { discordNotifications } from './services/discordNotifications.js';

// Test all Discord notification types
async function testAllNotifications() {
  console.log('Testing all Discord notification types...\n');
  
  const testUser = {
    discordId: '123456789012345678',
    username: 'TestUser',
    discriminator: '1234',
    avatar: undefined
  };

  const testListing = {
    id: 'test-listing-123',
    itemName: 'Raw Bass',
    quantity: 5,
    askingPrice: 100,
    acceptsItems: true,
    notes: 'Fresh catch of the day!'
  };

  const testOffer = {
    id: 'test-offer-456',
    listingId: 'test-listing-123',
    coinOffer: 120,
    message: 'Quick trade please!',
    buyerName: 'BuyerUser',
    buyerDiscordId: '987654321098765432'
  };

  try {
    // Test 1: Listing Created
    console.log('1. Testing Listing Created notification...');
    await discordNotifications.notifyListingCreated(testUser, testListing);
    console.log('✅ Listing Created notification sent\n');

    // Test 2: Listing Removed
    console.log('2. Testing Listing Removed notification...');
    await discordNotifications.notifyListingRemoved(testUser, testListing);
    console.log('✅ Listing Removed notification sent\n');

    // Test 3: Offer Received
    console.log('3. Testing Offer Received notification...');
    await discordNotifications.notifyOfferReceived(testUser, testListing, testOffer);
    console.log('✅ Offer Received notification sent\n');

    // Test 4: Offer Accepted
    console.log('4. Testing Offer Accepted notification...');
    await discordNotifications.notifyOfferAccepted(testUser, testListing, testOffer);
    console.log('✅ Offer Accepted notification sent\n');

    // Test 5: Offer Rejected
    console.log('5. Testing Offer Rejected notification...');
    await discordNotifications.notifyOfferRejected(testUser, testListing, testOffer);
    console.log('✅ Offer Rejected notification sent\n');

    console.log('🎉 All notification tests completed successfully!');
    console.log('Check your Discord channel for the test notifications.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run all tests
testAllNotifications();
