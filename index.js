require("dotenv").config();
const express = require("express");
const { verifyRequestSignature } = require("./webhook-signature");
const { handleIncoming, verifyWebhook } = require("./webhook");
const { onboardAgent, getStoredAgentId } = require("./onboarding");
const { getForgeReply } = require("./agent");

const app = express();
app.use(express.json({ verify: verifyRequestSignature }));

const PORT = process.env.PORT || 3000;

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "FlowForge WhatsApp Agent — Forge",
    number: process.env.WHATSAPP_PHONE_NUMBER_DISPLAY || "062 822 7013",
    agent_id: getStoredAgentId() || "not yet onboarded",
    timestamp: new Date().toISOString(),
  });
});

// ── Webhook verification (Meta handshake) ─────────────────
app.get("/webhook", verifyWebhook);

// ── Incoming WhatsApp messages ────────────────────────────
app.post("/webhook", handleIncoming);

// ── Website Forge AI API ──────────────────────────────────
// Allows the FlowForge website to use the same Forge AI
// engine as WhatsApp without exposing API credentials.

const ALLOWED_ORIGINS = new Set([
  "https://flowforgei.co.za",
  "https://www.flowforgei.co.za",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.post("/api/whatsapp/message", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "A message is required.",
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        error: "Message is too long.",
      });
    }

    const userId =
      typeof sessionId === "string" && sessionId.trim()
        ? sessionId.trim().slice(0, 100)
        : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    console.log(
      `[Web Chat] Message from ${userId}: "${message.trim()}"`
    );

    const reply = await getForgeReply(userId, message.trim());

    return res.status(200).json({
      success: true,
      reply,
      sessionId: userId,
    });
  } catch (err) {
    console.error("[Web Chat] Error:", err.message);

    return res.status(500).json({
      success: false,
      error:
        "Forge is temporarily unavailable. Please try again shortly.",
    });
  }
});

// ── Manual onboarding trigger ─────────────────────────────
// POST /onboard — call this once to register Forge with Meta
app.post("/onboard", async (req, res) => {
  const entityId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!entityId || !accessToken) {
    return res.status(400).json({
      success: false,
      error:
        "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set in .env",
    });
  }

  const result = await onboardAgent(entityId, accessToken);
  const status = result.success ? 201 : 400;

  if (result.success) {
    console.log(
      `[Server] 🎉 Agent ID ${result.agent_id} — save this as META_AGENT_ID in .env`
    );
  }

  res.status(status).json(result);
});

// ── Auto-onboard on startup (if credentials are ready) ───
async function autoOnboard() {
  const entityId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const agentId = getStoredAgentId();

  if (agentId) {
    console.log(
      `[Onboarding] ✅ Already onboarded — Agent ID: ${agentId}`
    );
    return;
  }

  if (!entityId || !accessToken) {
    console.log(
      `[Onboarding] ⏳ Waiting for WhatsApp credentials — skipping auto-onboard`
    );
    console.log(
      `[Onboarding]    Set WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN in .env`
    );
    console.log(
      `[Onboarding]    Then POST /onboard to register Forge with Meta`
    );
    return;
  }

  console.log(
    `[Onboarding] 🔄 Credentials found — attempting auto-onboard...`
  );

  const result = await onboardAgent(entityId, accessToken);

  if (result.success) {
    console.log(
      `\n[Onboarding] 🎉 SUCCESS! Add this to your .env:`
    );
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
║   Website : POST /api/whatsapp/message       ║
║   Onboard : POST /onboard                     ║
╚═══════════════════════════════════════════════╝
  `);

  // await autoOnboard();
});
