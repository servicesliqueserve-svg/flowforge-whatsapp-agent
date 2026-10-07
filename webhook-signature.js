const crypto = require("node:crypto");

function verifyWebhookSignature(req, res, rawBody) {
  const appSecret = process.env.META_APP_SECRET || process.env.APP_SECRET;
  if (!appSecret) {
    throw new Error("META_APP_SECRET must be set to accept webhook events.");
  }

  const signature = req.headers["x-hub-signature-256"];
  if (typeof signature !== "string" || !/^sha256=[a-f0-9]{64}$/i.test(signature)) {
    throw new Error("Missing or malformed Meta webhook signature.");
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest();
  const actual = Buffer.from(signature.slice("sha256=".length), "hex");

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error("Meta webhook signature validation failed.");
  }
}

function verifyRequestSignature(req, res, rawBody) {
  if (req.method === "POST" && req.path === "/webhook") {
    verifyWebhookSignature(req, res, rawBody);
  }
}

module.exports = { verifyRequestSignature, verifyWebhookSignature };
