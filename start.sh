#!/bin/sh

# Start the Node.js server in the background
cd /app/apps/server
echo "Starting server from: $(pwd)"
echo "Environment: NODE_ENV=$NODE_ENV, PORT=$PORT"
node dist/index.js &

# Start nginx in the foreground
nginx -g "daemon off;"
