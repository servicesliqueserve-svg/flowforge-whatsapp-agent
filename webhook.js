const { getForgeReply } = require("./agent");
const { sendWhatsAppMessage, markRead } = require("./whatsapp");

// ── Meta webhook verification handshake ──────────────────
function verifyWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.info("[Webhook] Meta verification succeeded.");
    return res.status(200).send(challenge);
  }

  console.warn("[Webhook] Meta verification rejected.");
  return res.sendStatus(403);
}

// ── Handle incoming WhatsApp messages ────────────────────
async function handleIncoming(req, res) {
  // Existing acknowledgement behavior is retained pending durable queue work.
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        for (const msg of value.messages) {
          if (msg.type !== "text") {
            await sendWhatsAppMessage(
              msg.from,
              "Hi! I can currently handle text messages only. Please type your question and I'll be happy to help 🙏"
            );
            continue;
          }

          const from = msg.from;
          const text = msg.text.body;
          const msgId = msg.id;

          // Do not write customer message content, phone numbers, or message IDs to logs.
          console.info("[Webhook] Incoming text message accepted for processing.");

          await markRead(msgId);
          const reply = await getForgeReply(from, text);
          await sendWhatsAppMessage(from, reply);
        }
      }
    }
  } catch (err) {
    console.error(
      "[Webhook] Message processing failed:",
      err.response?.status || err.code || "unknown error"
    );
  }
}

module.exports = { verifyWebhook, handleIncoming };
