#!/bin/bash

# Script to deploy conversation data to the web app
# Run this after executing cells 12-13 in the notebook

set -e

echo "🚀 Deploying BrickitV2 conversation data..."

# Check if file exists
if [ ! -f "brickit_conversations_public.json" ]; then
    echo "❌ Error: brickit_conversations_public.json not found"
    echo "   Please run cells 12-13 in cursor_conversations_export.ipynb first"
    exit 1
fi

# Create server public directory if it doesn't exist
mkdir -p ../server/public

# Copy file
cp brickit_conversations_public.json ../server/public/

echo "✅ Conversation data deployed to server/public/"
echo "📊 File size: $(du -h brickit_conversations_public.json | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Restart your server (npm run dev)"
echo "  2. Visit http://localhost:3000/how-it-was-built"
echo "  3. Or in production: https://brickit.build/how-it-was-built"

