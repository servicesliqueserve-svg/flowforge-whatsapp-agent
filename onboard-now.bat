@echo off
REM ═══════════════════════════════════════════════════════════
REM  FlowForge — Meta Business AI Agent Onboarding (Windows)
REM  Run this ONCE after filling in your credentials below
REM ═══════════════════════════════════════════════════════════

REM ── FILL THESE IN ─────────────────────────────────────────
SET ENTITY_ID=
REM  ^ Your WhatsApp Business Phone Number ID
REM    Found: developers.facebook.com → WhatsApp → API Setup

SET ACCESS_TOKEN=
REM  ^ Your WhatsApp Permanent Access Token
REM    Found: Meta Business Suite → System Users → Generate Token
REM    Required permission: whatsapp_business_messaging

REM ── VALIDATION ────────────────────────────────────────────
IF "%ENTITY_ID%"=="" (
  echo.
  echo [ERROR] Please fill in ENTITY_ID in this script first.
  echo         Found at: developers.facebook.com - Your App - WhatsApp - API Setup
  echo.
  pause
  exit /b 1
)

IF "%ACCESS_TOKEN%"=="" (
  echo.
  echo [ERROR] Please fill in ACCESS_TOKEN in this script first.
  echo         Found at: Meta Business Suite - System Users - Generate Token
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   FlowForge -- Meta Business AI Agent Onboarding
echo ============================================================
echo.
echo   Entity ID   : %ENTITY_ID%
echo   API Version : 2.0.0
echo   Endpoint    : https://api.facebook.com/%ENTITY_ID%/agent_onboarding
echo.
echo   Sending onboarding request to Meta...
echo.

REM ── RUN THE ONBOARDING CURL ───────────────────────────────
curl --request POST ^
  --url "https://api.facebook.com/%ENTITY_ID%/agent_onboarding/" ^
  --header "Authorization: Bearer %ACCESS_TOKEN%" ^
  --header "Content-Type: application/json" ^
  --header "X-API-Version: 2.0.0" ^
  --data "{}"

echo.
echo ============================================================
echo   Done! If you see "agent_id" above, copy it and add:
echo   META_AGENT_ID=^<the_agent_id^>  to your .env file
echo ============================================================
echo.
pause
