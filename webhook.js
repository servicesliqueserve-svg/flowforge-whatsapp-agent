const { getForgeReply } = require("./agent");
const { sendWhatsAppMessage, markRead } = require("./whatsapp");

// ── Meta webhook verification handshake ──────────────────
function verifyWebhook(req, res) {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[Webhook] ✅ Verified by Meta");
    return res.status(200).send(challenge);
  }

  console.warn("[Webhook] ❌ Verification failed — token mismatch");
  res.sendStatus(403);
}

// ── Handle incoming WhatsApp messages ────────────────────
async function handleIncoming(req, res) {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        for (const msg of value.messages) {
          // Only handle text messages for now
          if (msg.type !== "text") {
            await sendWhatsAppMessage(msg.from, "Hi! I can currently handle text messages only. Please type your question and I'll be happy to help 🙏");
            continue;
          }

          const from    = msg.from;          // user's WhatsApp number
          const text    = msg.text.body;     // message content
          const msgId   = msg.id;

          console.log(`[Message] From: ${from} | Text: "${text}"`);

          // Mark as read
          await markRead(msgId);

          // Get AI reply from Forge
          const reply = await getForgeReply(from, text);

          // Send reply back on WhatsApp
          await sendWhatsAppMessage(from, reply);
        }
      }
    }
  } catch (err) {
    console.error("[Webhook] Error:", err.message);
  }
}

module.exports = { verifyWebhook, handleIncoming };
