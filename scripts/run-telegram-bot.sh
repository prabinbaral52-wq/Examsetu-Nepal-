#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# ExamSetu Nepal - 24/7 Telegram Quiz Bot Termux Runner
# Prevents Android CPU sleep via termux-wake-lock and auto-restarts on crash.
# ==============================================================================

# Move to the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit 1

echo "===================================================================="
echo "🇳🇵 Starting ExamSetu Telegram Quiz Bot in Termux..."
echo "📂 Project root: $PROJECT_ROOT"
echo "===================================================================="

# Check for node
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed! Run: pkg install nodejs"
    exit 1
fi

# Activate Termux wake-lock to keep CPU awake when phone screen is locked
if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "🔒 Acquiring Termux Wake-Lock (keeps bot running with screen off)..."
    termux-wake-lock
fi

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Telegram Bot..."
    if command -v termux-wake-unlock >/dev/null 2>&1; then
        echo "🔓 Releasing Termux Wake-Lock..."
        termux-wake-unlock
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Auto-restart loop
while true; do
    echo "🚀 Launching bot/telegram-bot.js at $(date)..."
    node bot/telegram-bot.js
    EXIT_CODE=$?
    
    # If exited with 0 (clean exit or configuration message), exit loop
    if [ $EXIT_CODE -eq 0 ]; then
        echo "ℹ️ Bot stopped normally."
        break
    fi
    
    echo "⚠️ Bot crashed or was killed (Exit code: $EXIT_CODE). Restarting in 3 seconds..."
    sleep 3
done
