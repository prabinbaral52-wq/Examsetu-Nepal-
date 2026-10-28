# 🇳🇵 ExamSetu Nepal - Telegram Quiz Bot (Termux Guide)

यो बटले ExamSetu Nepal को SQLite डेटाबेस (`data/examsetu.db`) सँग प्रत्यक्ष जोडिएर Telegram मा वस्तुगत प्रश्नहरू (MCQs), Quiz Polls, Streak र XP प्रणाली स्वचालित रूपमा सञ्चालन गर्दछ।

---

## १. टेलिग्राम बट बनाउने (Telegram Bot Token प्राप्त गर्ने)

१. Telegram खोल्नुहोस् र सर्च बारमा `@BotFather` खोज्नुहोस्।
२. `@BotFather` लाई `/newbot` कमाण्ड पठाउनुहोस्।
३. आफ्नो बटको नाम राख्नुहोस् (जस्तै: `ExamSetu Nepal Quiz`).
४. आफ्नो बटको username राख्नुहोस्, जसको अन्त्यमा `bot` हुनुपर्छ (जस्तै: `ExamSetuQuizBot`).
५. BotFather ले तपाईंलाई एउटा **HTTP API Token** दिनेछ, जुन यस्तो देखिन्छ:
   `7213894721:AAHkQd_9J39...` (यसलाई सुरक्षित राख्नुहोस्)।

---

## २. Termux मा Bot Token सेट गर्ने

तपाईंको Termux मा परियोजना फोल्डरभित्र जानुहोस्:

```bash
cd ~/ExamSetu
```

`.env` फाइल खोल्नुहोस् वा सिधै टोकन थप्नुहोस्:

```bash
echo "TELEGRAM_BOT_TOKEN=तपाईंको_BOT_TOKEN_यहाँ_राख्नुहोस्" >> .env
```

*(नोट: `तपाईंको_BOT_TOKEN_यहाँ_राख्नुहोस्` को सट्टा BotFather ले दिएको वास्तविक टोकन राख्नुहोस्)*

---

## ३. बट सञ्चालन गर्ने (Running the Bot)

### तरिका १: सामान्य तरिकाले चलाउन:
```bash
npm run bot
```

### तरिका २: २४ घण्टा पृष्ठभूमिमा निरन्तर चलाउन (सिफारिश गरिएको):
यो स्क्रिप्टले फोनको स्क्रिन अफ भए पनि एन्ड्रोइडले प्रोसेस नमारोस् भनेर `termux-wake-lock` सुचारु गर्छ र कुनै कारणले इन्टरनेट कटेमा स्वचालित रूपमा ३ सेकेन्डभित्र फेरि सुरु गर्छ:

```bash
chmod +x scripts/run-telegram-bot.sh
./scripts/run-telegram-bot.sh
```

---

## ४. टेलिग्राममा उपलब्ध कमाण्डहरू

| कमाण्ड | कार्य |
|---|---|
| `/start` | बट सुरु गर्ने, परिचय र विधा (Lok Sewa, Banking, TSC) छनौट |
| `/quiz` | तत्काल नयाँ वस्तुगत प्रश्न (Interactive Quiz Poll) प्राप्त गर्ने |
| `/daily` | दैनिक ५-प्रश्न विशेष चुनौती |
| `/stats` | आफ्नो व्यक्तिगत स्कोर, Accuracy, Streak र XP हेर्ने |
| `/leaderboard` | नेपालभरिका शीर्ष १० विद्यार्थीहरूको सूची |
| `/categories` | अध्ययन गर्न चाहेको परीक्षा विधा फेर्ने |
| `/help` | सबै निर्देशन र कमाण्डहरूको सूची |

---

## ५. उपयोगी Termux टिप्स

- **स्क्रिन बन्द हुँदा पनि बट चलिरहोस् भन्नको लागि:**
  ```bash
  termux-wake-lock
  ```
- **बटलाई ब्याकग्राउन्डमा चलाउन (Termux बन्द गर्दा पनि चल्ने):**
  ```bash
  nohup node bot/telegram-bot.js > telegram-bot.log 2>&1 &
  ```
- **चलिरहेको लग हेर्न:**
  ```bash
  tail -f telegram-bot.log
  ```
- **बट बन्द गर्न:**
  ```bash
  pkill -f "node bot/telegram-bot.js"
  ```
