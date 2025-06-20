import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check the .env file path
const envPath = path.join(__dirname, '../../.env');
console.log('Looking for .env file at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

// Try to load it manually
dotenv.config({ path: envPath });

console.log('After loading .env:');
console.log('DISCORD_WEBHOOK_URL:', process.env.DISCORD_WEBHOOK_URL ? '[SET]' : '[NOT SET]');
console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? '[SET]' : '[NOT SET]');

// Check if we can read the file directly
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('File contains DISCORD_WEBHOOK_URL:', content.includes('DISCORD_WEBHOOK_URL'));
}
