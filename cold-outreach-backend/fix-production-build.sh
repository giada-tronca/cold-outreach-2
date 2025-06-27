#!/bin/bash

# Quick fix for production build issues with Prisma client
# Run this script to fix the UserRole and cOUsers compilation errors

set -e  # Exit on any error

echo "🔧 Quick fix for production build issues..."

echo "1️⃣ Regenerating Prisma client..."
npx prisma generate

echo "2️⃣ Running database migrations (if needed)..."
npx prisma migrate deploy

echo "3️⃣ Building application..."
npm run build

echo "✅ Quick fix completed!"
echo ""
echo "🔍 The following should now work:"
echo "- UserRole enum should be available from @prisma/client"
echo "- cOUsers model should be available in prisma client"
echo "- Application should build without TypeScript errors" 