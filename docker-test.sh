#!/bin/bash

# Docker Test Script for LinkedIn CTO Finder API
# This script helps test the Docker setup

echo "🐳 LinkedIn CTO Finder API - Docker Test Script"
echo "================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running."
    echo "   Please start Docker Desktop or run: sudo systemctl start docker"
    exit 1
fi

echo "✅ Docker is installed and running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your API keys before running the application"
fi

echo "🔨 Building Docker image..."
if docker build -t linkedin-cto-finder .; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

echo "🚀 Testing Docker container..."
echo "   Starting container in test mode..."

# Run container in test mode (will exit quickly due to missing API keys)
docker run --rm \
    --name linkedin-cto-finder-test \
    -p 3000:3000 \
    -e NODE_ENV=test \
    linkedin-cto-finder &

# Wait a moment for container to start
sleep 3

# Check if container is running
if docker ps | grep -q linkedin-cto-finder-test; then
    echo "✅ Container started successfully"
    echo "🌐 Application should be available at: http://localhost:3000"
    
    # Stop the test container
    docker stop linkedin-cto-finder-test 2>/dev/null
else
    echo "ℹ️  Container exited (expected if API keys are not configured)"
fi

echo ""
echo "🎉 Docker setup test completed!"
echo ""
echo "Next steps:"
echo "1. Configure your API keys in .env file"
echo "2. Run: docker-compose up -d"
echo "3. Visit: http://localhost:3000"
echo ""
echo "For Telegram bot:"
echo "1. Create bot with @BotFather"
echo "2. Add TELEGRAM_BOT_TOKEN to .env"
echo "3. Restart: docker-compose restart"