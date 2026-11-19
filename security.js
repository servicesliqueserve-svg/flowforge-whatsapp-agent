const crypto = require("node:crypto");

const DEFAULT_ALLOWED_ORIGINS = [
  "https://flowforgei.co.za",
  "https://www.flowforgei.co.za",
];

function isOnboardingEnabled(env = process.env) {
  return (
    env.ONBOARDING_ENABLED === "true" &&
    typeof env.ONBOARDING_ADMIN_TOKEN === "string" &&
    Buffer.byteLength(env.ONBOARDING_ADMIN_TOKEN, "utf8") >= 32
  );
}

function hasValidBearerToken(req, expectedToken) {
  if (typeof expectedToken !== "string" || Buffer.byteLength(expectedToken, "utf8") < 32) {
    return false;
  }

  const authorization = req?.headers?.authorization;
  if (typeof authorization !== "string") return false;

  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  if (!match) return false;

  const supplied = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(expectedToken, "utf8");

  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function getAllowedOrigins(env = process.env) {
  const configured = typeof env.CORS_ALLOWED_ORIGINS === "string"
    ? env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];

  const origins = configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;

  return [...new Set(origins.filter((origin) => {
    try {
      const parsed = new URL(origin);
      return (
        parsed.origin === origin &&
        (parsed.protocol === "https:" || parsed.protocol === "http:")
      );
    } catch {
      return false;
    }
  }))];
}

module.exports = {
  isOnboardingEnabled,
  hasValidBearerToken,
  getAllowedOrigins,
};
