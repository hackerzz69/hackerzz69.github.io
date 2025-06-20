import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { discordNotifications } from './services/discordNotifications.js';

// Test the Discord webhook notification
async function testWebhook() {
  console.log('Testing Discord webhook notification...');
  console.log('Webhook URL configured:', !!process.env.DISCORD_WEBHOOK_URL);
  
  try {
    await discordNotifications.notifyListingCreated(
      {
        discordId: '123456789012345678', // Test Discord ID
        username: 'TestUser',
        discriminator: '1234',
        avatar: undefined
      },
      {
        id: 'test-listing-123',
        itemName: 'Test Item',
        quantity: 5,
        askingPrice: 100,
        acceptsItems: true,
        notes: 'This is a test listing notification'
      }
    );
    console.log('✅ Webhook test completed successfully!');
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
  }
}

// Run the test
testWebhook();
