# Multi-stage Docker build for production

# Build stage for shared packages
FROM node:18-alpine as shared-build
WORKDIR /app
COPY package*.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
RUN yarn install --frozen-lockfile
COPY packages/shared ./packages/shared
RUN yarn workspace @highlite/shared build

# Build stage for client
FROM node:18-alpine as client-build
WORKDIR /app
COPY package*.json yarn.lock ./
COPY apps/client/package.json ./apps/client/
COPY --from=shared-build /app/packages ./packages
RUN yarn install --frozen-lockfile
COPY apps/client ./apps/client
RUN yarn workspace @highlite/client build

# Build stage for server
FROM node:18-alpine as server-build
WORKDIR /app
COPY package*.json yarn.lock ./
COPY apps/server/package.json ./apps/server/
COPY --from=shared-build /app/packages ./packages
RUN yarn install --frozen-lockfile
COPY apps/server ./apps/server
RUN yarn workspace @highlite/server build

# Production stage
FROM nginx:stable-alpine as production

# Install Node.js for the server
RUN apk add --no-cache nodejs npm

# Copy built client files to nginx
COPY --from=client-build /app/apps/client/dist /usr/share/nginx/html

# Copy server files
COPY --from=server-build /app/apps/server/dist /app/server
COPY --from=server-build /app/apps/server/package.json /app/server/
COPY --from=server-build /app/node_modules /app/node_modules
COPY --from=shared-build /app/packages /app/packages

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80 3000

CMD ["/start.sh"]
