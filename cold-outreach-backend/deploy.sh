#!/bin/bash

# Cold Outreach Backend Deployment Script
# This script handles proper deployment with database migrations and Prisma client regeneration

set -e  # Exit on any error

echo "🚀 Starting Cold Outreach Backend Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the backend root directory."
    exit 1
fi

# Check if Prisma schema exists
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Prisma schema not found."
    exit 1
fi

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if ! timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/6379' 2>/dev/null; then
    echo "❌ Error: Cannot connect to Redis at 127.0.0.1:6379"
    echo ""
    echo "Redis is required for the Cold Outreach backend to function."
    echo "Please install Redis using one of these methods:"
    echo ""
    echo "📋 Option 1 - Ubuntu/Debian:"
    echo "   sudo ./install-redis.sh"
    echo ""
    echo "📋 Option 2 - CentOS/RHEL:"
    echo "   sudo ./install-redis-centos.sh"
    echo ""
    echo "📋 Option 3 - Docker:"
    echo "   ./docker-redis.sh"
    echo ""
    echo "📋 Option 4 - Manual:"
    echo "   # Ubuntu/Debian: sudo apt install redis-server"
    echo "   # CentOS/RHEL: sudo yum install redis"
    echo "   # Then: sudo systemctl start redis-server"
    echo ""
    exit 1
else
    echo "✅ Redis is running and accessible"
fi

echo "📦 Installing dependencies..."
npm ci

echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "🏗️  Building TypeScript application..."
npm run build

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the application: npm start"
echo "2. Or start with PM2: pm2 start ecosystem.config.js"
echo ""
echo "🔍 Verify deployment:"
echo "- Check health endpoint: curl http://localhost:3001/api/health"
echo "- Check database connection"
echo "- Verify all authentication endpoints work" 