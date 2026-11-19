require("dotenv").config();
const express = require("express");
const { verifyRequestSignature } = require("./webhook-signature");
const { handleIncoming, verifyWebhook } = require("./webhook");
const { onboardAgent } = require("./onboarding");
const { getForgeReply } = require("./agent");
const {
  isOnboardingEnabled,
  hasValidBearerToken,
  getAllowedOrigins,
} = require("./security");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb", verify: verifyRequestSignature }));

const PORT = process.env.PORT || 3000;

// ── Health check ──────────────────────────────────────────
// Keep the public health response operational, not identificatory.
app.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    status: "online",
    service: "Forge API",
    timestamp: new Date().toISOString(),
  });
});

// ── Webhook verification (Meta handshake) ─────────────────
app.get("/webhook", verifyWebhook);

// ── Incoming WhatsApp messages ────────────────────────────
app.post("/webhook", handleIncoming);

// ── Website Forge AI API ──────────────────────────────────
const ALLOWED_ORIGINS = new Set(getAllowedOrigins());

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
  res.set("Cache-Control", "no-store");

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

    console.info("[Web Chat] Request accepted.");

    const reply = await getForgeReply(userId, message.trim());

    return res.status(200).json({
      success: true,
      reply,
      sessionId: userId,
    });
  } catch (err) {
    console.error(
      "[Web Chat] Request failed:",
      err.response?.status || err.code || "unknown error"
    );

    return res.status(500).json({
      success: false,
      error: "Forge is temporarily unavailable. Please try again shortly.",
    });
  }
});

// ── Manual Meta onboarding trigger ────────────────────────
// Disabled by default. Enable only for an approved, one-time admin action.
app.post("/onboard", async (req, res) => {
  res.set("Cache-Control", "no-store");

  if (!isOnboardingEnabled()) {
    return res.sendStatus(404);
  }

  if (!hasValidBearerToken(req, process.env.ONBOARDING_ADMIN_TOKEN)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorised.",
    });
  }

  const entityId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!entityId || !accessToken) {
    return res.status(503).json({
      success: false,
      error: "Onboarding is not configured.",
    });
  }

  try {
    const result = await onboardAgent(entityId, accessToken);

    if (!result.success) {
      console.error("[Onboarding] Admin-triggered onboarding failed.");
      return res.status(502).json({
        success: false,
        error: "Onboarding failed. Check restricted service logs.",
      });
    }

    console.info("[Onboarding] Admin-triggered onboarding completed.");
    return res.status(201).json({
      success: true,
      agent_id: result.agent_id,
    });
  } catch (err) {
    console.error(
      "[Onboarding] Admin-triggered request failed:",
      err.response?.status || err.code || "unknown error"
    );
    return res.status(502).json({
      success: false,
      error: "Onboarding failed. Check restricted service logs.",
    });
  }
});

// ── Start server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Forge API listening on port ${PORT}`);
});
