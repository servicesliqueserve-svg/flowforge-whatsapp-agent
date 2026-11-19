const axios = require("axios");

const REQUEST_TIMEOUT_MS = 15000;

function getBaseUrl() {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || "v27.0";
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error("WHATSAPP_GRAPH_API_VERSION must use the format vNN.N.");
  }
  return `https://graph.facebook.com/${version}`;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// ── Send a text message ───────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  const url = `${getBaseUrl()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };

  try {
    const res = await axios.post(url, payload, {
      headers: getHeaders(),
      timeout: REQUEST_TIMEOUT_MS,
    });
    console.info("[WhatsApp] Outbound message accepted by Graph API.");
    return res.data;
  } catch (err) {
    console.error(
      "[WhatsApp] Outbound message failed:",
      err.response?.status || err.code || "unknown error"
    );
    throw err;
  }
}

// ── Mark incoming message as read ─────────────────────────
async function markRead(messageId) {
  const url = `${getBaseUrl()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };

  try {
    await axios.post(url, payload, {
      headers: getHeaders(),
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch (err) {
    // Non-critical; never log message identifiers or provider response bodies.
    console.warn(
      "[WhatsApp] Read receipt failed:",
      err.response?.status || err.code || "unknown error"
    );
  }
}

module.exports = { sendWhatsAppMessage, markRead };
