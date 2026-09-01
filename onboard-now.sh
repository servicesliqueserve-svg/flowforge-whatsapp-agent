#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  FlowForge — Meta Business AI Agent Onboarding Script
#  Run this ONCE after filling in your credentials below
# ═══════════════════════════════════════════════════════════

# ── FILL THESE IN ─────────────────────────────────────────
ENTITY_ID=""         # Your WhatsApp Business Phone Number ID
                     # Found: developers.facebook.com → WhatsApp → API Setup

ACCESS_TOKEN=""      # Your WhatsApp Permanent Access Token
                     # Found: Meta Business Suite → System Users → Generate Token
                     # Required permission: whatsapp_business_messaging

# ── VALIDATION ────────────────────────────────────────────
if [ -z "$ENTITY_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "❌  Please fill in ENTITY_ID and ACCESS_TOKEN in this script first."
  echo ""
  echo "    ENTITY_ID    → developers.facebook.com → Your App → WhatsApp → API Setup"
  echo "    ACCESS_TOKEN → Meta Business Suite → System Users → Generate Token"
  echo ""
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  FlowForge — Meta Business AI Agent Onboarding  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Entity ID   : $ENTITY_ID"
echo "  API Version : 2.0.0"
echo "  Endpoint    : https://api.facebook.com/$ENTITY_ID/agent_onboarding"
echo ""
echo "  🔄 Sending onboarding request to Meta..."
echo ""

# ── RUN THE ONBOARDING CURL (exact spec) ──────────────────
RESPONSE=$(curl --silent --request POST \
  --url "https://api.facebook.com/${ENTITY_ID}/agent_onboarding/" \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --header "Content-Type: application/json" \
  --header "X-API-Version: 2.0.0" \
  --data '{}' \
  --write-out "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "  Response ($HTTP_STATUS):"
echo "  $BODY"
echo ""

# ── HANDLE RESPONSE ───────────────────────────────────────
if [ "$HTTP_STATUS" = "201" ]; then
  # Extract agent_id from JSON response
  AGENT_ID=$(echo "$BODY" | grep -o '"agent_id":"[^"]*"' | cut -d'"' -f4)

  echo "  ✅  Onboarding successful!"
  echo ""
  echo "  ┌─────────────────────────────────────────────┐"
  echo "  │  Your Meta Business AI Agent ID:            │"
  echo "  │                                             │"
  echo "  │  META_AGENT_ID=$AGENT_ID"
  echo "  │                                             │"
  echo "  │  Add this to your .env file now ↑           │"
  echo "  └─────────────────────────────────────────────┘"
  echo ""

  # Auto-append to .env if it exists in same directory
  if [ -f ".env" ]; then
    if grep -q "META_AGENT_ID=" .env; then
      # Replace existing empty value
      sed -i "s/META_AGENT_ID=.*/META_AGENT_ID=$AGENT_ID/" .env
      echo "  📝  Auto-saved META_AGENT_ID to .env"
    else
      echo "META_AGENT_ID=$AGENT_ID" >> .env
      echo "  📝  Auto-appended META_AGENT_ID to .env"
    fi
  fi

elif [ "$HTTP_STATUS" = "400" ]; then
  echo "  ❌  Bad Request — check your ENTITY_ID is the Phone Number ID (not the phone number itself)"
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "  ❌  Unauthorized — your ACCESS_TOKEN is invalid or expired"
  echo "      Generate a new one: Meta Business Suite → System Users → Generate Token"
elif [ "$HTTP_STATUS" = "403" ]; then
  echo "  ❌  Forbidden — your token is missing the 'whatsapp_business_messaging' permission"
  echo "      Regenerate token with that permission checked"
elif [ "$HTTP_STATUS" = "429" ]; then
  echo "  ⏳  Rate limited — wait 60 seconds and run again"
elif [ "$HTTP_STATUS" = "500" ]; then
  echo "  ❌  Meta server error — try again in a few minutes"
else
  echo "  ❌  Unexpected response: HTTP $HTTP_STATUS"
fi

echo ""
