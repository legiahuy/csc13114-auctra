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

# Resolve Database Hostname to IPv4
echo "🔄 Resolving Database Host to IPv4..."
RESOLVED_DB_URL=$(node resolve-db.js)

if [ ! -z "$RESOLVED_DB_URL" ]; then
    export DATABASE_URL=$RESOLVED_DB_URL
    echo "✅ Database URL updated with IPv4 address"
else
    echo "⚠️ Could not resolve IPv4, using original URL"
fi

echo "🔄 Starting application..."

# Start the application
exec node dist/server.js
