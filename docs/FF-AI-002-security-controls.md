# FF-AI-002 — Security boundary controls

## Purpose

Introduce reviewable, testable security controls without changing the production deployment. This is a first implementation slice, not a production-readiness declaration.

## Changes in this pull request

- Close the Meta onboarding route by default. Enabling it requires an explicit environment flag and a bearer token of at least 32 bytes; comparison uses constant-time equality.
- Restrict default browser CORS origins to the approved FlowForge website. Localhost must be explicitly configured for local development.
- Bound JSON request bodies to 32 KB and disable the Express technology header.
- Remove phone numbers, inbound text, message identifiers, model response bodies, and provider error bodies from routine application logs in the files changed here.
- Make WhatsApp Graph API version configurable and default it to v27.0; enforce a version format and set an outbound request timeout.
- Add unit tests for the onboarding gate, bearer authorization, exact CORS origin parsing, Graph API URL selection, and request timeout.

## Explicitly not solved by this change

- Durable webhook ingestion, retry handling, idempotency, and dead-letter processing.
- Persistent, expiring, bounded conversation storage and safe horizontal scaling.
- Website session ownership / signed session tokens.
- Distributed rate limiting, quotas, and model-cost budgets.
- Full end-to-end Meta integration tests and monitored production canaries.
- Independent confirmation of Railway's currently deployed commit, Meta dashboard settings, and external-user outcomes.

## Deployment guardrails

Do not merge or deploy until the owner verifies the Railway service, runtime configuration, Meta app/phone-number mapping, Graph API compatibility, and rollback path. Never paste secret values into GitHub issues, pull requests, chat, screenshots, or logs. If onboarding is ever required, use a dedicated 32+ character token from a secret manager, enable the route only for the approved operation, then disable it again.

## Acceptance evidence required

- CI passes on this branch.
- Review confirms the onboarding route is inaccessible by default and returns no Meta-side effects without explicit enablement and valid authorization.
- Staging tests confirm webhook signatures, customer message routing, retry/recovery behavior, no duplicate customer replies, and no sensitive data in logs.
- Session isolation, expiry, and abuse controls have separate tests.
- A Railway deployment is promoted only after a verified health check and documented rollback reference.
