# 🎯 Quick Start: Exporting Conversations

## What This Does

Exports your Cursor AI conversations about building BrickitV2 into a public-safe JSON file that can be shared on the web.

## Steps

### 1. Open the Notebook
```bash
cd scripts
# Open cursor_conversations_export.ipynb in Cursor
```

### 2. Select Kernel
- Choose **"Cursor Explorer (Python 3.14)"** when prompted

### 3. Run All Cells
- Press "Run All" or run cells 1-13 sequentially
- **Important:** Cells 12-13 create the BrickitV2-filtered export

### 4. Deploy to Web
```bash
./deploy-conversations.sh
```

### 5. View the Page
- Development: `http://localhost:5173/how-it-was-built`
- Production: `https://brickit.build/how-it-was-built`

## What Gets Exported

✅ All conversations from BrickitV2 workspace (identified via composerData paths)
✅ Token counts and cost estimates per conversation
✅ Full chat history (user and AI messages)
🔒 API keys and secrets automatically scrubbed

## Cost Breakdown

The page shows:
- Total conversations about BrickitV2
- Total messages exchanged
- Token usage (input/output)
- Estimated cost (based on Claude Sonnet 3.5 pricing)

Perfect for sharing your AI-assisted development journey! 🎉
