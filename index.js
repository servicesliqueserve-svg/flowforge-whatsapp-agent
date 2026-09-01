require("dotenv").config();
const express = require("express");
const { handleIncoming, verifyWebhook } = require("./webhook");
const { onboardAgent, getStoredAgentId } = require("./onboarding");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status:    "online",
    service:   "FlowForge WhatsApp Agent — Forge",
    number:    process.env.WHATSAPP_PHONE_NUMBER_DISPLAY || "062 822 7013",
    agent_id:  getStoredAgentId() || "not yet onboarded",
    timestamp: new Date().toISOString(),
  });
});

// ── Webhook verification (Meta handshake) ─────────────────
app.get("/webhook", verifyWebhook);

// ── Incoming WhatsApp messages ────────────────────────────
app.post("/webhook", handleIncoming);

// ── Manual onboarding trigger ─────────────────────────────
// POST /onboard  — call this once to register Forge with Meta
app.post("/onboard", async (req, res) => {
  const entityId    = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!entityId || !accessToken) {
    return res.status(400).json({
      success: false,
      error:   "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set in .env",
    });
  }

  const result = await onboardAgent(entityId, accessToken);
  const status = result.success ? 201 : 400;

  if (result.success) {
    console.log(`[Server] 🎉 Agent ID ${result.agent_id} — save this as META_AGENT_ID in .env`);
  }

  res.status(status).json(result);
});

// ── Auto-onboard on startup (if credentials are ready) ───
async function autoOnboard() {
  const entityId    = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const agentId     = getStoredAgentId();

  if (agentId) {
    console.log(`[Onboarding] ✅ Already onboarded — Agent ID: ${agentId}`);
    return;
  }

  if (!entityId || !accessToken) {
    console.log(`[Onboarding] ⏳ Waiting for WhatsApp credentials — skipping auto-onboard`);
    console.log(`[Onboarding]    Set WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN in .env`);
    console.log(`[Onboarding]    Then POST /onboard to register Forge with Meta`);
    return;
  }

  console.log(`[Onboarding] 🔄 Credentials found — attempting auto-onboard...`);
  const result = await onboardAgent(entityId, accessToken);

  if (result.success) {
    console.log(`\n[Onboarding] 🎉 SUCCESS! Add this to your .env:`);
    console.log(`             META_AGENT_ID=${result.agent_id}\n`);
  }
}

// ── Start server ──────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   FlowForge WhatsApp Agent — Forge   ONLINE   ║
║   Port    : ${PORT}                              ║
║   Number  : 062 822 7013                      ║
║   Webhook : POST /webhook                     ║
║   Onboard : POST /onboard                     ║
╚═══════════════════════════════════════════════╝
  `);

  await autoOnboard();
});
