#!/bin/bash

# Development setup script
echo "🚀 Setting up Highlite Website for development..."

# Check Node.js version
node_version=$(node -v | cut -d'v' -f2)
required_version="22.16.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "⚠️  Warning: Node.js version $node_version detected. Please use Node.js $required_version or higher."
fi

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Please install Yarn 4.0+ first:"
    echo "   npm install -g yarn"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo "📋 Creating .env file from template..."
  cp .env.example .env
  echo "⚠️  Please update the .env file with your actual values"
fi

# Install dependencies
echo "📦 Installing dependencies with Yarn..."
yarn install

# Build shared package
echo "🔨 Building shared package..."
yarn workspace @highlite/shared build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual values"
echo "2. Run 'yarn dev' to start development servers"
echo "3. Visit http://localhost:5173 for the frontend"
echo "4. Visit http://localhost:3000 for the backend API"
