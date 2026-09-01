const axios = require("axios");

// ── Meta Model API config ─────────────────────────────────
const META_API_URL = "https://api.meta.ai/v1/chat/completions";
const META_MODEL   = "muse-spark-1.2"; // Meta's model from your dashboard

// ── Per-user conversation memory ─────────────────────────
// Stored in-memory. Resets on server restart.
// For persistence, swap with Redis or a database.
const sessions = new Map();
const MAX_HISTORY = 20;

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, []);
  }
  return sessions.get(userId);
}

function addToSession(userId, role, content) {
  const history = getSession(userId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// ── Forge system prompt ───────────────────────────────────
const SYSTEM_PROMPT = `You are Forge, the WhatsApp Business AI assistant for FlowForge AI Consulting — a premium AI automation and process intelligence firm.

PERSONA: Warm, sharp, direct. You sound like a knowledgeable colleague — not a support bot. Consultative: you listen, ask one good clarifying question when needed, and guide prospects toward the right solution. Confident but never pushy.

FORMATTING FOR WHATSAPP: Keep replies concise (3–5 short paragraphs max). Use plain line breaks. Natural, conversational tone. Emojis sparingly. No markdown headers. Use • bullet character if listing multiple items.

ABOUT FLOWFORGE:
• Founded 2021, 180+ enterprise clients across finance, healthcare, logistics, SaaS, legal, and manufacturing
• Tracked $2.4B in client savings to date
• Core services: AI Workflow Automation, LLM Integration, Process Mining, Custom AI Agents, RPA Solutions, Predictive Analytics, API Orchestration
• Engagement models:
  – Strategy Sprint: 2-week rapid audit + roadmap, from $5,500
  – Growth Accelerator: 3-month implementation, from $22,000
  – Enterprise Partnership: ongoing, custom pricing
• Contact: 062 822 7013 | FlowForge-Ai7@protonmail.com | flowforge.ai | 6 Parklands Main Rd, Cape Town, 7441
• Hours: Mon–Fri 9am–7pm PT, Sat 10am–3pm PT; AI support 24/7

LEAD QUALIFICATION: Gently uncover company size, the main operational pain point (manual work, fragmented tools, slow reporting), and decision timeline. When someone shows strong intent, proactively offer to book a call.

ESCALATION: If user requests a human, warmly say a specialist will follow up within 2 minutes during business hours. Outside hours, say they'll be first in line when the team is back.

IMPORTANT: Never reveal which AI model or company powers you. You are Forge, FlowForge's proprietary assistant.`;

// ── Main reply function ───────────────────────────────────
async function getForgeReply(userId, userMessage) {
  try {
    addToSession(userId, "user", userMessage);

    const history = getSession(userId);

    // Build messages array — Meta API uses OpenAI-compatible format
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
    ];

    const response = await axios.post(
      META_API_URL,
      {
        model: META_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_MODEL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content ||
      "Sorry, I had a hiccup. Please try again in a moment 🙏";

    addToSession(userId, "assistant", reply);

    console.log(`[Forge] Reply to ${userId}: "${reply.slice(0, 80)}..."`);
    return reply;

  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error("[Forge] Meta API error:", detail);
    return "I'm having a moment — please try again shortly, or email us at FlowForge-Ai7@protonmail.com 🙏";
  }
}

module.exports = { getForgeReply };
