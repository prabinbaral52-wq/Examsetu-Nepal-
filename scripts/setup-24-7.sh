#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# ExamSetu Nepal - 24/7 Termux Daemon Setup Script
# Keeps ExamSetu and Telegram Bot running permanently in Android background.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit 1

echo "===================================================================="
echo "🇳🇵 Setting up ExamSetu 24/7 Background Runner in Termux"
echo "===================================================================="

# 1. Acquire Android CPU Wake-Lock
if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "🔒 [1/4] Acquiring Termux Wake-Lock (CPU will stay awake)..."
    termux-wake-lock
else
    echo "ℹ️ Note: run 'pkg install termux-api' for automatic wake-lock."
fi

# 2. Check for PM2 (Production Process Manager for Node.js)
if ! command -v pm2 >/dev/null 2>&1; then
    echo "📦 [2/4] Installing PM2 Process Manager (lightweight background runner)..."
    npm install -g pm2
fi

# 3. Stop previous instance if running
pm2 delete examsetu-bot >/dev/null 2>&1

# 4. Start Bot using PM2 with Auto-Restart and Crash Recovery
echo "🚀 [3/4] Launching ExamSetu Telegram Bot with PM2..."
pm2 start bot.js --name "examsetu-bot" --max-memory-restart 150M --time

# 5. Save PM2 state
echo "💾 [4/4] Saving PM2 state..."
pm2 save

# 6. Auto-start on Device Boot (if termux-boot installed)
BOOT_DIR="$HOME/.termux/boot"
if [ -d "$BOOT_DIR" ]; then
    echo "⚡ Configuring auto-boot on phone restart..."
    cat << 'BOOT_EOF' > "$BOOT_DIR/start-examsetu.sh"
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
pm2 resurrect
BOOT_EOF
    chmod +x "$BOOT_DIR/start-examsetu.sh"
fi

echo ""
echo "===================================================================="
echo "✅ EXAMSETU IS NOW RUNNING 24/7 IN THE BACKGROUND!"
echo "===================================================================="
echo "• View live logs:       pm2 logs examsetu-bot"
echo "• Check status:         pm2 status"
echo "• Restart bot:          pm2 restart examsetu-bot"
echo "• Stop bot:             pm2 stop examsetu-bot"
echo "===================================================================="
