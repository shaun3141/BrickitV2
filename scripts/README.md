# Scripts Directory

This directory contains utility scripts for exploring and exporting Cursor conversation data.

## 📄 Files

### `cursor_conversations_export.ipynb` ⭐

**Clean, production-ready notebook for exporting conversations to JSON with pricing data and secret scrubbing.**

Features:
- ✅ Loads all your Cursor conversations from local database
- 📊 Groups messages into conversation threads  
- 🔍 Identifies project-specific conversations via composerData workspace paths
- 🔒 **Automatically scrubs API keys, tokens, and secrets**
- 💰 Calculates token usage and estimated costs per conversation
- 📄 Exports to beautiful JSON format perfect for sharing publicly

**Outputs:**
- `cursor_conversations_export.json` - Full export (private, gitignored)
- `brickit_conversations_public.json` - **BrickitV2 only, secrets scrubbed, safe to publish!** ⭐

### Prerequisites

Python 3.11+ and `uv` package manager.

### Setup (First Time Only)

The virtual environment and kernel are already set up! If you need to recreate it:

```bash
cd scripts

# Create virtual environment
uv venv

# Activate it
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Register as Jupyter kernel
python -m ipykernel install --user --name=cursor-explorer --display-name="Cursor Explorer (Python 3.14)"
```

### Usage

1. **In Cursor/VS Code:**
   - Open `cursor_conversations_export.ipynb`
   - When prompted to select a kernel, choose **"Cursor Explorer (Python 3.14)"**
   - Run all cells sequentially (takes ~10-15 seconds)
   - **Important:** Run cells 12-13 to generate the BrickitV2-filtered export

2. **Or in Jupyter:**
   ```bash
   source .venv/bin/activate
   jupyter notebook cursor_conversations_export.ipynb
   ```

3. **Deploy to web app:**
   ```bash
   # After running the notebook, copy the public file to server
   cp brickit_conversations_public.json ../server/public/
   
   # The data will now be available at /api/conversations/brickit
   # View it at https://brickit.build/how-it-was-built
   ```

## 📊 What Gets Exported

### JSON Structure

The clean notebook exports a single JSON file with this structure:

```json
{
  "metadata": {
    "export_date": "2025-10-30T09:00:00",
    "total_conversations": 148,
    "total_messages": 4630,
    "total_tokens": {
      "input": 2458392,
      "output": 346218,
      "total": 2804610
    },
    "estimated_total_cost_usd": 12.57,
    "pricing_note": "Estimated using Claude Sonnet 3.5 pricing: $3/M input, $15/M output tokens"
  },
  "conversations": [
    {
      "workspace_id": "99e28323-50a4-4c...",
      "title": "I made an .env file - let's set up a basic use-case for Supabase auth",
      "message_count": 198,
      "user_messages": 9,
      "assistant_messages": 189,
      "tokens": {
        "input": 156842,
        "output": 24318,
        "total": 181160
      },
      "estimated_cost_usd": 0.84,
      "messages": [
        {
          "role": "user",
          "text": "I made an .env file - let's set up...",
          "timestamp": "2025-10-15T14:30:00",
          "tokens": {
            "input": 0,
            "output": 0
          },
          "model": "default"
        },
        {
          "role": "assistant",
          "text": "I'll help you set up Supabase auth...",
          "timestamp": "2025-10-15T14:30:05",
          "tokens": {
            "input": 12842,
            "output": 842
          },
          "model": "unknown"
        }
      ]
    }
  ]
}
```

### What's Included

- **All conversation text** (user prompts and AI responses)
- **Conversation titles** (first user message)
- **Message counts** (user vs assistant)
- **Token usage** (input/output tokens per message and conversation)
- **Cost estimates** (based on Claude Sonnet 3.5 pricing: $3/M input, $15/M output)
- **Timestamps** (when available)
- **Workspace IDs** (for grouping related conversations)
- **Model information** (when available)

### What's Excluded/Scrubbed

- Code diffs and file changes
- Linter errors and diagnostics
- Tool execution results
- Image attachments
- System metadata
- **🔒 API keys, tokens, and secrets** (automatically detected and redacted)

### Secret Scrubbing

The notebook automatically detects and removes:
- OpenAI API keys (`sk-...`)
- Stripe keys (`pk_live_...`, `sk_live_...`)
- PostHog keys (`phc_...`)
- GitHub tokens (`ghp_...`, `gho_...`)
- Google API keys (`AIza...`)
- JWT tokens
- Generic API keys and secrets

All secrets are replaced with descriptive placeholders like `[OPENAI_API_KEY]`, `[STRIPE_SECRET_KEY]`, etc.

This keeps the export clean, focused on the conversational content, and **safe to publish publicly** - perfect for sharing the story of how you built your project! 🎉

