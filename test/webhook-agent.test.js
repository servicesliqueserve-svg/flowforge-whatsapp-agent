const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { verifyWebhook, handleIncoming } = require("../webhook");
const { getForgeReply } = require("../agent");
const {
  verifyRequestSignature,
  verifyWebhookSignature,
} = require("../webhook-signature");

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

test("Meta webhook signatures accept an authentic raw request body", () => {
  const previousSecret = process.env.META_APP_SECRET;
  process.env.META_APP_SECRET = "test-meta-app-secret";
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
  const signature = require("node:crypto")
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    assert.doesNotThrow(() =>
      verifyWebhookSignature(
        { headers: { "x-hub-signature-256": `sha256=${signature}` } },
        {},
        rawBody
      )
    );
  } finally {
    if (previousSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = previousSecret;
  }
});

test("Meta webhook signatures reject missing secrets and invalid signatures", () => {
  const previousSecret = process.env.META_APP_SECRET;
  const previousAppSecret = process.env.APP_SECRET;
  const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');

  try {
    delete process.env.META_APP_SECRET;
    delete process.env.APP_SECRET;
    assert.throws(
      () => verifyWebhookSignature({ headers: {} }, {}, rawBody),
      /META_APP_SECRET must be set/
    );

    process.env.META_APP_SECRET = "test-meta-app-secret";
    assert.throws(
      () =>
        verifyWebhookSignature(
          { headers: { "x-hub-signature-256": `sha256=${"0".repeat(64)}` } },
          {},
          rawBody
        ),
      /signature validation failed/
    );
  } finally {
    if (previousSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = previousSecret;
    if (previousAppSecret === undefined) delete process.env.APP_SECRET;
    else process.env.APP_SECRET = previousAppSecret;
  }
});

test("signature middleware does not block the website chat endpoint", () => {
  assert.doesNotThrow(() =>
    verifyRequestSignature(
      { method: "POST", path: "/api/whatsapp/message", headers: {} },
      {},
      Buffer.from('{"message":"hello"}')
    )
  );
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
