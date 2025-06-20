#!/bin/sh

# Start the Node.js server in the background
cd /app/server
node index.js &

# Start nginx in the foreground
nginx -g "daemon off;"
