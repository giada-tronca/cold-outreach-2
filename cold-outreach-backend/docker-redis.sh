#!/bin/bash

# Docker-based Redis Setup for Cold Outreach Backend
# Alternative method using Docker if you prefer containerized Redis

set -e  # Exit on any error

echo "🐳 Setting up Redis using Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/engine/install/"
    exit 1
fi

echo "📥 Pulling Redis Docker image..."
docker pull redis:alpine

echo "🚀 Starting Redis container..."
docker run -d \
  --name cold-outreach-redis \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:alpine

echo "⏳ Waiting for Redis to start..."
sleep 3

echo "🧪 Testing Redis connection..."
docker exec cold-outreach-redis redis-cli ping

echo "🔍 Redis container info:"
docker ps | grep cold-outreach-redis

echo ""
echo "✅ Redis Docker container started successfully!"
echo ""
echo "📋 Container management commands:"
echo "   Start: docker start cold-outreach-redis"
echo "   Stop: docker stop cold-outreach-redis"
echo "   Restart: docker restart cold-outreach-redis"
echo "   Logs: docker logs cold-outreach-redis"
echo "   Remove: docker rm -f cold-outreach-redis"
echo ""
echo "🔧 Redis is now available at: 127.0.0.1:6379" 