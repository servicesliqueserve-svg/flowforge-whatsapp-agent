const axios = require("axios");

// ── Meta Business AI Agent Onboarding ────────────────────
// Based on: Agent Onboarding API v2.0.0
// Endpoint: POST https://api.facebook.com/{entity_id}/agent_onboarding
// This registers Forge as an official Meta Business AI Agent
// on your WhatsApp Business Phone Number.

const ONBOARDING_BASE = "https://api.facebook.com";
const API_VERSION     = "2.0.0";

/**
 * Trigger onboarding for a Meta Business AI Agent.
 *
 * @param {string} entityId   - Your WhatsApp Business Phone Number ID
 * @param {string} accessToken - Your WhatsApp permanent access token
 * @param {string|null} catalogId - Optional Instagram catalog ID (null for WhatsApp)
 * @returns {Promise<{ agent_id: string }>}
 */
async function onboardAgent(entityId, accessToken, catalogId = null) {
  const url = `${ONBOARDING_BASE}/${entityId}/agent_onboarding`;

  const body = {};
  if (catalogId) {
    body.catalog_id = catalogId; // Only used for Instagram agents
  }

  console.log(`[Onboarding] 🚀 Starting Meta Business AI Agent onboarding...`);
  console.log(`[Onboarding] Entity ID: ${entityId}`);
  console.log(`[Onboarding] Endpoint : ${url}`);

  try {
    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-API-Version": API_VERSION,
      },
      timeout: 30000,
    });

    const { agent_id } = response.data;

    console.log(`[Onboarding] ✅ Agent onboarded successfully!`);
    console.log(`[Onboarding] Agent ID: ${agent_id}`);

    return { success: true, agent_id };

  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.message;
    const title  = err.response?.data?.title  || "Error";

    console.error(`[Onboarding] ❌ Failed [${status}] ${title}: ${detail}`);

    // Human-readable error messages matching the OpenAPI spec
    const messages = {
      400: `Bad request — check your Phone Number ID is correct.`,
      401: `Unauthorized — your access token is missing or invalid.`,
      403: `Forbidden — your token doesn't have permission to onboard agents.`,
      429: `Rate limited — too many requests. Wait a minute and try again.`,
      500: `Meta server error — try again in a few minutes.`,
    };

    return {
      success: false,
      error: messages[status] || detail,
      status,
    };
  }
}

/**
 * Check if agent is already onboarded by attempting a dry-run status check.
 * Returns the saved agent_id from env if already set.
 */
function getStoredAgentId() {
  return process.env.META_AGENT_ID || null;
}

module.exports = { onboardAgent, getStoredAgentId };
