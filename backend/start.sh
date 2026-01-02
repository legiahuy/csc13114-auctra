#!/bin/sh
set -e

echo "🚀 Starting Online Auction Backend..."
echo "📍 Environment: ${NODE_ENV:-production}"
echo "🔌 Port: ${PORT:-3000}"

# Check critical environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set!"
    echo "Please configure DATABASE_URL in Railway environment variables"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ ERROR: JWT_SECRET is not set!"
    echo "Please configure JWT_SECRET in Railway environment variables"
    exit 1
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    echo "❌ ERROR: JWT_REFRESH_SECRET is not set!"
    echo "Please configure JWT_REFRESH_SECRET in Railway environment variables"
    exit 1
fi

echo "✅ Environment variables validated"
echo "🔄 Starting application..."

# Start the application
exec node dist/server.js
