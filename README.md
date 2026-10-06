# FlowForge WhatsApp Agent — Backend

Automatically replies to WhatsApp messages on **062 822 7013** using the Forge AI agent, powered by Meta Model API and Muse Spark.

---

## Project Structure

```
flowforge-whatsapp-backend/
├── index.js          ← Express server entry point
├── webhook.js        ← Meta webhook verification + message routing
├── agent.js          ← Forge AI agent (Meta Model API + conversation memory)
├── whatsapp.js       ← WhatsApp Cloud API sender
├── .env.example      ← Environment variable template
└── README.md
```

---

## Setup (Local)

### 1. Clone & install
```bash
npm install
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Then open `.env` and fill in your credentials:

| Variable | Where to find it |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Dev Dashboard → WhatsApp → API Setup |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta Dev Dashboard → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business Suite → System Users → Generate Token |
| `WHATSAPP_VERIFY_TOKEN` | You choose this (e.g. `flowforge2024`) |
| `META_APP_SECRET` | Meta Developer Dashboard → App Settings → Basic |
| `META_MODEL_API_KEY` | dev.meta.ai → API Keys → Create API Key |

### 3. Run locally
```bash
npm start
```
Server starts on `http://localhost:3000`

---

## Deploy to Railway (Free, Recommended)

1. Go to **railway.app** and sign up (free)
2. Click **New Project → Deploy from GitHub**
3. Push this folder to a GitHub repo first, then connect it
4. In Railway dashboard → **Variables**, add all required env variables from `.env.example`
5. Railway gives you a public URL like `https://flowforge-agent.up.railway.app`

---

## Connect to Meta Webhook

1. Go to **Meta Developer Dashboard → Your App → WhatsApp → Configuration**
2. Click **Edit** under Webhook
3. Set:
   - **Callback URL**: `https://your-railway-url.up.railway.app/webhook`
   - **Verify Token**: whatever you set as `WHATSAPP_VERIFY_TOKEN`
4. Click **Verify and Save**
5. Under **Webhook Fields**, subscribe to **messages**

---

## How It Works

```
Customer texts 062 822 7013
        ↓
Meta WhatsApp Cloud API
        ↓
POST /webhook (this server)
        ↓
agent.js → Meta Llama AI via Meta Model API (Forge persona)
        ↓
whatsapp.js → sends reply back
        ↓
Customer sees reply on WhatsApp ✅
```

---

## Conversation Memory

Each user gets their own conversation history (last 20 messages). This means Forge remembers context within a session — e.g. if a user says "I'm from a 50-person SaaS company", Forge will remember that for the rest of the conversation.

Memory resets when the server restarts. For persistent memory across restarts, integrate Redis or a database.

---

## Contact

📧 FlowForge-Ai7@protonmail.com  
📞 062 822 7013  
🌐 flowforge.ai

---

## Meta Business AI Agent Onboarding (API v2.0.0)

This backend uses the official **Meta Business AI Agent Onboarding API** to register Forge as a verified Meta Business AI Agent on your WhatsApp number.

### Steps

**1. Complete your .env** (all 5 WhatsApp credentials filled in)

**2. Start the server**
```bash
npm start
```
The server auto-attempts onboarding on startup if credentials are present.

**3. Or trigger manually**
```bash
curl -X POST http://localhost:3000/onboard
```

**4. Save your Agent ID**
The console will print:
```
[Onboarding] 🎉 SUCCESS! Add this to your .env:
             META_AGENT_ID=1234567890
```
Copy that value into your `.env` file.

### What the onboarding does
- Registers Forge on your WhatsApp Business Phone Number ID
- Creates the necessary Meta Business AI entities
- Schedules async jobs for data preparation on Meta's side
- Returns an `agent_id` that identifies your agent permanently

### API Reference
- Endpoint: `POST https://api.facebook.com/{phone_number_id}/agent_onboarding`
- Version: `2.0.0`
- Auth: Bearer token (your WhatsApp Access Token)
