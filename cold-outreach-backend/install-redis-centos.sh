#!/bin/bash

# Redis Installation Script for CentOS/RHEL Production Servers
# This script installs and configures Redis for the Cold Outreach backend

set -e  # Exit on any error

echo "🔧 Installing Redis for Cold Outreach Backend (CentOS/RHEL)..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo or as root"
    echo "   Usage: sudo ./install-redis-centos.sh"
    exit 1
fi

echo "📦 Installing EPEL repository..."
yum install -y epel-release

echo "📥 Installing Redis server..."
yum install -y redis

echo "🔧 Configuring Redis..."
# Configure Redis to start automatically
systemctl enable redis

# Start Redis service
systemctl start redis

echo "✅ Checking Redis status..."
systemctl status redis --no-pager

echo "🧪 Testing Redis connection..."
redis-cli ping

echo "🔍 Redis configuration info:"
echo "   Redis is running on: 127.0.0.1:6379"
echo "   Service status: $(systemctl is-active redis)"
echo "   Service enabled: $(systemctl is-enabled redis)"

echo ""
echo "✅ Redis installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Your Cold Outreach backend should now connect to Redis"
echo "2. Restart your application: pm2 restart cold-outreach-backend"
echo "3. Check application logs: pm2 logs cold-outreach-backend" 