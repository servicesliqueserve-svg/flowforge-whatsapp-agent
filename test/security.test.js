const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isOnboardingEnabled,
  hasValidBearerToken,
  getAllowedOrigins,
} = require("../security");

const validToken = "test-only-token-that-is-at-least-32-characters";

test("onboarding is disabled unless explicitly enabled with a sufficiently long token", () => {
  assert.equal(isOnboardingEnabled({}), false);
  assert.equal(isOnboardingEnabled({
    ONBOARDING_ENABLED: "true",
    ONBOARDING_ADMIN_TOKEN: "too-short",
  }), false);
  assert.equal(isOnboardingEnabled({
    ONBOARDING_ENABLED: "false",
    ONBOARDING_ADMIN_TOKEN: validToken,
  }), false);
  assert.equal(isOnboardingEnabled({
    ONBOARDING_ENABLED: "true",
    ONBOARDING_ADMIN_TOKEN: validToken,
  }), true);
});

test("onboarding bearer token comparison accepts only the exact token", () => {
  assert.equal(hasValidBearerToken({
    headers: { authorization: `Bearer ${validToken}` },
  }, validToken), true);

  assert.equal(hasValidBearerToken({
    headers: { authorization: "Bearer wrong-token" },
  }, validToken), false);

  assert.equal(hasValidBearerToken({ headers: {} }, validToken), false);
  assert.equal(hasValidBearerToken({
    headers: { authorization: `Bearer ${validToken}` },
  }, "short"), false);
});

test("default browser origins exclude localhost", () => {
  const origins = getAllowedOrigins({});
  assert.deepEqual(origins, [
    "https://flowforgei.co.za",
    "https://www.flowforgei.co.za",
  ]);
  assert.equal(origins.includes("http://localhost:3000"), false);
});

test("configured browser origins are exact, validated, and de-duplicated", () => {
  assert.deepEqual(getAllowedOrigins({
    CORS_ALLOWED_ORIGINS: "https://example.com, https://example.com, javascript:alert(1), https://example.com/path",
  }), ["https://example.com"]);
});
