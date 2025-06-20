import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { discordNotifications } from './services/discordNotifications.js';

// Debug webhook configuration
console.log('Discord Webhook Configuration Debug:');
console.log('DISCORD_WEBHOOK_URL exists:', !!process.env.DISCORD_WEBHOOK_URL);
console.log('DISCORD_BOT_TOKEN exists:', !!process.env.DISCORD_BOT_TOKEN);

// Test if the service is configured
console.log('Service configured:', (discordNotifications as any).isConfigured());
console.log('Webhook URL set:', !!(discordNotifications as any).webhookUrl);
console.log('Bot token set:', !!(discordNotifications as any).botToken);
