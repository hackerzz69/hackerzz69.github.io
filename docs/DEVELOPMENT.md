# Development Guide

## Quick Start

1. **Setup the project:**
   ```bash
   ./scripts/setup.sh
   ```

2. **Start development:**
   ```bash
   npm run dev
   ```

## Project Structure

### Monorepo Architecture
This project uses npm workspaces to manage multiple packages:

- `apps/client` - Vue.js frontend
- `apps/server` - Express.js backend
- `packages/shared` - Shared types and utilities

### Key Files

#### Root Level
- `package.json` - Workspace configuration and root scripts
- `tsconfig.json` - TypeScript project references
- `.env` - Environment variables
- `scripts/` - Development and deployment scripts

#### Client (`apps/client/`)
- `src/` - Vue.js source code
- `public/` - Static assets
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - Client TypeScript config

#### Server (`apps/server/`)
- `index.ts` - Express server entry point
- `config/` - Database and authentication config
- `routes/` - API route definitions
- `models/` - Database models
- `middleware/` - Express middleware

#### Shared (`packages/shared/`)
- `src/types.ts` - Shared TypeScript types
- `src/utils.ts` - Shared utility functions
- `src/index.ts` - Package exports

## Development Workflow

### Starting Development
```bash
# Start both client and server
yarn dev

# Or start individually
yarn dev:client  # Frontend only
yarn dev:server  # Backend only
```

### Making Changes

1. **Frontend changes:** Edit files in `apps/client/src/`
2. **Backend changes:** Edit files in `apps/server/`
3. **Shared types:** Edit files in `packages/shared/src/`

### Adding Dependencies

```bash
# Add to client
yarn workspace @highlite/client add <package>

# Add to server
yarn workspace @highlite/server add <package>

# Add to shared
yarn workspace @highlite/shared add <package>

# Add dev dependency to client
yarn workspace @highlite/client add -D <package>
```

### Building

```bash
# Build everything
yarn build

# Build specific workspace
yarn build:client
yarn build:server
```

## Code Organization

### Frontend (Vue.js)
- **Components:** Reusable Vue components in `apps/client/src/components/`
- **Views:** Page-level components in `apps/client/src/views/`
- **Stores:** Pinia stores in `apps/client/src/stores/`
- **Composables:** Vue composables in `apps/client/src/composables/`
- **Assets:** Static files in `apps/client/src/assets/`

### Backend (Express.js)
- **Routes:** API endpoints in `apps/server/routes/`
- **Models:** Database models in `apps/server/models/`
- **Config:** Configuration files in `apps/server/config/`
- **Middleware:** Express middleware in `apps/server/middleware/`

### Shared Code
- **Types:** TypeScript interfaces and types
- **Utils:** Helper functions used by both client and server
- **Constants:** Shared constants and enums

## Database

### SQLite Database
The application uses SQLite for development:
- Database file: `apps/server/database.sqlite`
- Migrations: Handled in `apps/server/config/database.ts`

### Adding New Models
1. Create model in `apps/server/models/`
2. Add database schema migration
3. Add corresponding types to `packages/shared/src/types.ts`

## Authentication

### Discord OAuth Flow
1. Client redirects to `/auth/discord`
2. User authorizes on Discord
3. Discord redirects to `/auth/discord/callback`
4. Server creates session and JWT token
5. Client receives token and stores it

### Protected Routes
- Backend: Use `authenticateToken` middleware
- Frontend: Use `auth` store and route guards

## Environment Variables

### Required Variables
- `DISCORD_CLIENT_ID` - Discord OAuth app ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth app secret
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session encryption secret

### Optional Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS

## Debugging

### Frontend Debugging
- Vue DevTools browser extension
- Vite dev server with HMR
- Browser developer tools

### Backend Debugging
- Use `tsx watch` for hot reloading
- Console logging and debug statements
- Node.js debugger with `--inspect`

### Database Debugging
- SQLite browser tools
- Database query logging

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Change ports in `.env` file
   - Kill processes using the ports

2. **CORS errors:**
   - Check `FRONTEND_URL` in `.env`
   - Verify CORS configuration in server

3. **Authentication issues:**
   - Verify Discord OAuth settings
   - Check JWT and session secrets

4. **Build errors:**
   - Clear `node_modules` and reinstall
   - Check TypeScript errors
   - Verify workspace dependencies

### Resetting Development Environment
```bash
# Clean everything
yarn clean

# Reinstall dependencies
yarn install

# Rebuild shared package
yarn workspace @highlite/shared build

# Start fresh
yarn dev
```
