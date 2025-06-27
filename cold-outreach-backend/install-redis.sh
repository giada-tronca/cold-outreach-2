#!/bin/bash

# Redis Installation Script for Ubuntu/Debian Production Servers
# This script installs and configures Redis for the Cold Outreach backend

set -e  # Exit on any error

echo "🔧 Installing Redis for Cold Outreach Backend..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo or as root"
    echo "   Usage: sudo ./install-redis.sh"
    exit 1
fi

echo "📦 Updating package list..."
apt update

echo "📥 Installing Redis server..."
apt install -y redis-server

echo "🔧 Configuring Redis..."
# Configure Redis to start automatically
systemctl enable redis-server

# Start Redis service
systemctl start redis-server

echo "✅ Checking Redis status..."
systemctl status redis-server --no-pager

echo "🧪 Testing Redis connection..."
redis-cli ping

echo "🔍 Redis configuration info:"
echo "   Redis is running on: 127.0.0.1:6379"
echo "   Service status: $(systemctl is-active redis-server)"
echo "   Service enabled: $(systemctl is-enabled redis-server)"

echo ""
echo "✅ Redis installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Your Cold Outreach backend should now connect to Redis"
echo "2. Restart your application: pm2 restart cold-outreach-backend"
echo "3. Check application logs: pm2 logs cold-outreach-backend"
echo ""
echo "🔧 Useful Redis commands:"
echo "   Check status: sudo systemctl status redis-server"
echo "   Restart Redis: sudo systemctl restart redis-server"
echo "   Test connection: redis-cli ping" 