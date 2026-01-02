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
    # Extract host for logging (don't log credentials)
    # Using simple sed to verify update
    SAFE_HOST=$(echo $RESOLVED_DB_URL | sed 's/.*@//' | sed 's/:.*//')
    echo "✅ Database URL updated. Host: $SAFE_HOST"
else
    echo "⚠️ Could not resolve IPv4, using original URL"
fi

# Resolve Email Host to IPv4 (fixes Connection Timeout)
if [ ! -z "$EMAIL_HOST" ]; then
    echo "🔄 Resolving Email Host ($EMAIL_HOST)..."
    RESOLVED_EMAIL_HOST=$(node resolve-db.js email)
    if [ ! -z "$RESOLVED_EMAIL_HOST" ]; then
        # Check if it's different
        if [ "$RESOLVED_EMAIL_HOST" != "$EMAIL_HOST" ]; then
             export EMAIL_HOST=$RESOLVED_EMAIL_HOST
             echo "✅ EMAIL_HOST updated to IPv4: $RESOLVED_EMAIL_HOST"
        fi
    fi
fi

echo "🔄 Starting application..."

# Start the application
exec node dist/server.js
