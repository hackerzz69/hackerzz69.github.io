#!/bin/bash

# Script to configure the application for IP-based access

# Get the local IP address
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo "Detected IP address: $IP_ADDRESS"

# Create client environment file for IP access
cat > apps/client/.env.local << EOF
# Client environment for IP access
VITE_API_URL=http://$IP_ADDRESS:3000
EOF

echo "✅ Client configured to use API at http://$IP_ADDRESS:3000"
echo ""
echo "You can now:"
echo "1. Start the development servers with: yarn dev"
echo "2. Access the application at:"
echo "   - http://localhost:5173 (localhost)"
echo "   - http://$IP_ADDRESS:5173 (IP access)"
echo ""
echo "Note: Discord OAuth will still redirect to localhost unless you update"
echo "the Discord application settings to include the IP-based callback URL."
