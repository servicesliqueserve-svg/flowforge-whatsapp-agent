const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { sendWhatsAppMessage } = require("../whatsapp");

test("WhatsApp sender uses the configured Graph API version and request timeout", async () => {
  const originalPost = axios.post;
  const originalLog = console.info;
  const originalError = console.error;
  const previousVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  const previousPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const previousToken = process.env.WHATSAPP_ACCESS_TOKEN;
  let captured;

  process.env.WHATSAPP_GRAPH_API_VERSION = "v27.0";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-access-token";
  console.info = () => {};
  console.error = () => {};

  axios.post = async (...args) => {
    captured = args;
    return { data: { messages: [{ id: "wamid.test" }] } };
  };

  try {
    const result = await sendWhatsAppMessage("27820000000", "Test message");

    assert.deepEqual(result, { messages: [{ id: "wamid.test" }] });
    assert.equal(
      captured[0],
      "https://graph.facebook.com/v27.0/test-phone-number-id/messages"
    );
    assert.equal(captured[2].timeout, 15000);
    assert.equal(captured[2].headers.Authorization, "Bearer test-access-token");
  } finally {
    axios.post = originalPost;
    console.info = originalLog;
    console.error = originalError;

    if (previousVersion === undefined) delete process.env.WHATSAPP_GRAPH_API_VERSION;
    else process.env.WHATSAPP_GRAPH_API_VERSION = previousVersion;
    if (previousPhoneId === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    else process.env.WHATSAPP_PHONE_NUMBER_ID = previousPhoneId;
    if (previousToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = previousToken;
  }
});

test("WhatsApp sender rejects an invalid Graph API version before making a request", async () => {
  const previousVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  const previousPost = axios.post;
  let called = false;

  process.env.WHATSAPP_GRAPH_API_VERSION = "latest";
  axios.post = async () => {
    called = true;
    throw new Error("Unexpected network call");
  };

  try {
    await assert.rejects(
      () => sendWhatsAppMessage("27820000000", "Test message"),
      /WHATSAPP_GRAPH_API_VERSION must use the format/
    );
    assert.equal(called, false);
  } finally {
    axios.post = previousPost;
    if (previousVersion === undefined) delete process.env.WHATSAPP_GRAPH_API_VERSION;
    else process.env.WHATSAPP_GRAPH_API_VERSION = previousVersion;
  }
});
