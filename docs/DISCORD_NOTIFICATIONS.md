# Discord Notifications Testing Guide

This guide explains how to test Discord notifications for marketplace events.

## Prerequisites

1. Either a Discord webhook URL or Discord bot token configured in your `.env` file
2. A running instance of the marketplace application
3. A Discord account linked to the application

## Setup Options

### Option 1: Discord Webhook (Easiest)

1. **Create a Discord Webhook:**
   - Go to your Discord server settings
   - Navigate to Integrations → Webhooks
   - Click "New Webhook"
   - Choose a channel where notifications will be posted
   - Copy the webhook URL

2. **Configure the application:**
   ```bash
   # Add to your .env file
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
   
   # Optional: Set your frontend URL for direct links in notifications
   FRONTEND_URL=http://localhost:5173
   ```

3. **Restart your server:**
   ```bash
   yarn workspace @highlite/server dev
   ```

### Option 2: Discord Bot (For Direct Messages)

1. **Create a Discord Bot:**
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section
   - Create a bot and copy the token
   - Enable "Message Content Intent" if needed

2. **Configure the application:**
   ```bash
   # Add to your .env file
   DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
   
   # Optional: Set your frontend URL for direct links in notifications
   FRONTEND_URL=http://localhost:5173
   ```

3. **Invite the bot to your server:**
   - Go to OAuth2 → URL Generator
   - Select "bot" scope
   - Select "Send Messages" permission
   - Use the generated URL to invite the bot

## Testing Notifications

### Test Listing Creation
1. Log into the marketplace with your Discord account
2. Create a new listing by clicking "Create Listing"
3. Fill out the form and submit
4. **Expected:** You should receive a Discord notification about the listing creation

### Test Listing Removal
1. Go to your active listings
2. Click "Remove" on one of your listings
3. **Expected:** You should receive a Discord notification about the listing removal

### Test Offer Notifications
1. **As a buyer:** Make an offer on someone else's listing
2. **Expected:** The listing owner should receive a notification about the new offer
3. **As a seller:** Accept or reject the offer
4. **Expected:** The buyer should receive a notification about the offer status

## Troubleshooting

### No notifications received
- Check the server console for error messages
- Verify your Discord webhook URL or bot token is correct
- Ensure the bot has permissions to send messages
- Check that users have DMs enabled from server members (for bot notifications)

### Webhook vs Bot behavior
- **Webhook:** Posts notifications to a specific channel (everyone can see)
- **Bot:** Sends direct messages to individual users (private)
- If both are configured, the system tries DM first, then falls back to webhook

### Error Messages
- `Failed to send Discord notification`: Check your configuration
- `403 Forbidden`: Bot lacks permissions or user has DMs disabled
- `404 Not Found`: Invalid webhook URL or bot token

## Example Notification Content

### Listing Created
```
🛍️ New Listing Created
Your listing for **Raw Bass** has been created successfully!

📦 Item: Raw Bass
🔢 Quantity: 5
💰 Asking Price: 25 coins
🔄 Accepts Trades: Yes
🔗 Direct Link: [View on Marketplace](http://localhost:5173/marketplace?listing=abc123)
```

### Offer Received
```
🤝 New Offer Received
You received a new offer for your **Raw Bass** listing!

📦 Your Item: 5x Raw Bass
👤 Buyer: PlayerName
💰 Coin Offer: 30 coins
💬 Message: Quick trade please!
🔗 View Listing: [Open in Marketplace](http://localhost:5173/marketplace?listing=abc123)
```

### Offer Accepted
```
✅ Offer Accepted
Your offer for **Raw Bass** has been accepted!

📦 Item: 5x Raw Bass
💰 Your Offer: 30 coins
```
