#!/bin/bash

# Fix Docker permissions script for LinkedIn CTO Finder API
# This script rebuilds the Docker image with proper permissions

echo "🔧 Fixing Docker permissions for LinkedIn CTO Finder API..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Remove old volumes (optional - uncomment if you want to start fresh)
# echo "🗑️  Removing old volumes..."
# docker volume rm linkedin_cto_finder_api_csv_data 2>/dev/null || true

# Rebuild the image
echo "🏗️  Rebuilding Docker image..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Check status
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "✅ Permission fix complete!"
echo "📋 To view logs: docker-compose logs -f"
echo "🌐 API should be available at: http://localhost:3000"
echo "📁 CSV files will be stored in the named volume: csv_data"