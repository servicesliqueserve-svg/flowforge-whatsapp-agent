const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { verifyWebhook, handleIncoming } = require("../webhook");
const { getForgeReply } = require("../agent");

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
}

test("webhook verification returns the challenge for the configured token", () => {
  const previousToken = process.env.WHATSAPP_VERIFY_TOKEN;
  process.env.WHATSAPP_VERIFY_TOKEN = "test-verify-token";

  try {
    const res = createResponse();
    verifyWebhook(
      {
        query: {
          "hub.mode": "subscribe",
          "hub.verify_token": "test-verify-token",
          "hub.challenge": "challenge-value",
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, "challenge-value");
  } finally {
    if (previousToken === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
    else process.env.WHATSAPP_VERIFY_TOKEN = previousToken;
  }
});

test("webhook verification rejects a mismatched token", () => {
  const previousToken = process.env.WHATSAPP_VERIFY_TOKEN;
  process.env.WHATSAPP_VERIFY_TOKEN = "test-verify-token";

  try {
    const res = createResponse();
    verifyWebhook(
      {
        query: {
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong-token",
          "hub.challenge": "challenge-value",
        },
      },
      res
    );

    assert.equal(res.statusCode, 403);
  } finally {
    if (previousToken === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
    else process.env.WHATSAPP_VERIFY_TOKEN = previousToken;
  }
});

test("incoming webhook acknowledges unsupported events without external calls", async () => {
  const res = createResponse();
  await handleIncoming({ body: { object: "unsupported" } }, res);
  assert.equal(res.statusCode, 200);
});

test("Forge sends a chat-completion request and returns the model reply", async () => {
  const originalPost = axios.post;
  const originalLog = console.log;
  const originalError = console.error;
  const previousKey = process.env.META_MODEL_API_KEY;
  let request;

  process.env.META_MODEL_API_KEY = "test-model-key";
  console.log = () => {};
  console.error = () => {};
  axios.post = async (...args) => {
    request = args;
    return {
      status: 200,
      data: { choices: [{ message: { content: "Mocked reply" } }] },
    };
  };

  try {
    const reply = await getForgeReply("test-session", "Hello Forge");

    assert.equal(reply, "Mocked reply");
    assert.equal(request[0], "https://api.meta.ai/v1/chat/completions");
    assert.equal(request[1].model, "muse-spark-1.2");
    assert.equal(request[1].messages.at(-1).content, "Hello Forge");
    assert.equal(request[2].headers.Authorization, "Bearer test-model-key");
  } finally {
    axios.post = originalPost;
    console.log = originalLog;
    console.error = originalError;
    if (previousKey === undefined) delete process.env.META_MODEL_API_KEY;
    else process.env.META_MODEL_API_KEY = previousKey;
  }
});

