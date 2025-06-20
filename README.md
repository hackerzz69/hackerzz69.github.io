# Highlite Website

A full-stack web application built with Vue.js and Express.js featuring a marketplace, interactive maps, and user authentication.

## 🏗️ Project Structure

This is a monorepo organized as follows:

```
├── apps/
│   ├── client/          # Vue.js frontend application
│   └── server/          # Express.js backend API
├── packages/
│   └── shared/          # Shared types and utilities
└── docs/                # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.16.0 LTS
- Yarn >= 4.0.0

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd highlite-website
```

2. Install dependencies for all workspaces:
```bash
yarn install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

### Development

Start both client and server in development mode:
```bash
yarn dev
```

Or start them individually:
```bash
# Start only the client (frontend)
yarn dev:client

# Start only the server (backend)
yarn dev:server
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Building for Production

Build both applications:
```bash
yarn build
```

Or build them individually:
```bash
yarn build:client
yarn build:server
```

### Running in Production

After building, start the production server:
```bash
yarn start
```

## 📁 Applications

### Client (`apps/client`)
- **Framework**: Vue.js 3 with TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: CSS with custom styles
- **Features**:
  - Interactive maps with OpenLayers
  - Marketplace interface
  - User authentication
  - Responsive design

### Server (`apps/server`)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite
- **Authentication**: Passport.js with Discord OAuth
- **Features**:
  - RESTful API
  - User management
  - Marketplace endpoints
  - Session management

### Shared (`packages/shared`)
- **Purpose**: Common types, interfaces, and utilities
- **Contents**:
  - TypeScript type definitions
  - Utility functions
  - Shared constants

## 🔧 Available Scripts

### Root Level
- `yarn dev` - Start both client and server in development mode
- `yarn build` - Build both applications for production
- `yarn start` - Start the production server
- `yarn clean` - Clean all node_modules and build artifacts

### Client Scripts
- `yarn dev:client` - Start client development server
- `yarn build:client` - Build client for production

### Server Scripts
- `yarn dev:server` - Start server in development mode
- `yarn build:server` - Build server for production

## 🌐 Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=./server/database.sqlite

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback

# Session Secret
SESSION_SECRET=your_session_secret_key

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

## 🗄️ Database

The application uses SQLite for data storage. The database file is located at `apps/server/database.sqlite`.

### Database Schema

- **Users**: User accounts and profile information
- **MarketplaceItems**: Items available in the marketplace
- **Sessions**: User session data

## 🔐 Authentication

The application uses Discord OAuth for authentication:

1. Users click "Login with Discord"
2. They're redirected to Discord's OAuth page
3. After authorization, they're redirected back with an access token
4. The server creates a session and JWT token
5. The client stores the token for API requests

## 🎨 Features

### Interactive Maps
- Multiple map layers (overworld, underground, sky)
- Custom markers for NPCs and locations
- Zoom and pan functionality
- Position indicators

### Marketplace
- Browse and search items
- Item categories and filtering
- User-generated content
- Price tracking

### User System
- Discord OAuth integration
- User profiles and avatars
- Session management
- Protected routes

## 🛠️ Development

### Code Style
- TypeScript for type safety
- Vue 3 Composition API

### Project Conventions
- Use TypeScript for all new code
- Follow Vue.js style guide
- Use shared types from `@highlite/shared`
- Write meaningful commit messages

## 📦 Deployment

1. Build the applications:
```bash
yarn build
```

2. Set production environment variables

3. Start the production server:
```bash
yarn start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests if available
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.