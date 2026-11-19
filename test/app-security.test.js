const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { once } = require("node:events");

process.env.CORS_ALLOWED_ORIGINS =
  "https://flowforgei.co.za,https://www.flowforgei.co.za";

const app = require("../index");

async function withServer(run) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("onboarding route is closed by default and causes no Meta API call", async () => {
  const variables = [
    "ONBOARDING_ENABLED",
    "ONBOARDING_ADMIN_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
  ];
  const previous = Object.fromEntries(
    variables.map((name) => [name, process.env[name]])
  );
  const originalPost = axios.post;
  let outboundCalls = 0;

  process.env.ONBOARDING_ENABLED = "false";
  process.env.ONBOARDING_ADMIN_TOKEN =
    "test-only-token-that-is-at-least-32-characters";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-access-token";
  axios.post = async () => {
    outboundCalls += 1;
    throw new Error("A Meta call must not be made in this test.");
  };

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      assert.equal(response.status, 404);
      assert.equal(outboundCalls, 0);
    });
  } finally {
    axios.post = originalPost;
    for (const name of variables) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("website CORS preflight permits the approved site and omits localhost", async () => {
  await withServer(async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/api/whatsapp/message`, {
      method: "OPTIONS",
      headers: { Origin: "https://flowforgei.co.za" },
    });
    assert.equal(allowed.status, 204);
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "https://flowforgei.co.za"
    );

    const local = await fetch(`${baseUrl}/api/whatsapp/message`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000" },
    });
    assert.equal(local.status, 204);
    assert.equal(local.headers.get("access-control-allow-origin"), null);
  });
});
