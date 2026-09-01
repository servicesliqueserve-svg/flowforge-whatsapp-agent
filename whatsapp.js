const axios = require("axios");

const BASE_URL = "https://graph.facebook.com/v19.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// ── Send a text message ───────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  const url = `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };

  try {
    const res = await axios.post(url, payload, { headers: getHeaders() });
    console.log(`[WhatsApp] ✅ Sent to ${to}`);
    return res.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error(`[WhatsApp] ❌ Send failed:`, detail);
    throw err;
  }
}

// ── Mark incoming message as read (shows blue ticks) ─────
async function markRead(messageId) {
  const url = `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };

  try {
    await axios.post(url, payload, { headers: getHeaders() });
    console.log(`[WhatsApp] 👁 Marked read: ${messageId}`);
  } catch (err) {
    // Non-critical — don't throw
    console.warn(`[WhatsApp] Could not mark read: ${err.message}`);
  }
}

// ── Send a typing indicator (optional, cosmetic) ─────────
async function sendTyping(to) {
  // WhatsApp Business API doesn't support typing indicators natively,
  // but you can add a brief delay before sending to feel more human.
  return new Promise((resolve) => setTimeout(resolve, 1200));
}

module.exports = { sendWhatsAppMessage, markRead, sendTyping };
