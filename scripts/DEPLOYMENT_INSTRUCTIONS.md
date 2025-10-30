# 🚀 Deploying Conversation Data

## Quick Start

1. **Run the notebook cells 12-13** in `cursor_conversations_export.ipynb`
   - This will generate `brickit_conversations_public.json`

2. **Deploy to server:**
   ```bash
   ./deploy-conversations.sh
   ```

3. **Restart your dev server** (if running)
   ```bash
   cd ../server && npm run dev
   ```

4. **Visit the page:**
   - Local: http://localhost:5173/how-it-was-built
   - Production: https://brickit.build/how-it-was-built

## What You'll See

- 📊 Stats overview (conversations, messages, tokens, cost)
- 📝 List of all BrickitV2-related conversations
- 💬 Click any conversation to see the full chat history
- 🔒 All secrets automatically scrubbed

## Files Created

- `brickit_conversations_public.json` - The data file (safe to publish)
- `server/public/brickit_conversations_public.json` - Served via API
- API endpoint: `/api/conversations/brickit`
- Frontend page: `/how-it-was-built`
