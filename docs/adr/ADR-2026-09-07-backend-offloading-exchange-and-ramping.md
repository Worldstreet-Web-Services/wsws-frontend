# ADR-2026-09-07: Offloading Crypto Exchange and Fiat Ramping to Backend Gateway Services

## Status

Proposed — 2026-09-07. Awaiting human maintainer review and approval.

---

## Context

Currently, the Next.js application (`wsws-frontend`) hosts direct proxy handlers and partner secrets in its server runtime:

1. **Crypto Exchange & Cross-Chain Swaps**:
   - `app/api/dextopus/[...path]/route.ts` and `lib/server/dextopus.ts`.
   - Holds partner keys (`DEXTOPUS_API_KEY`, `DEXTOPUS_WITHDRAW_API_KEY`, `DEXTOPUS_TRADE_API_KEY`).
   - Forwards raw queries directly to `https://swap-api.dextopus.com/api`.
   - Client code performs ad-hoc error response scraping and client-side retry loops.
2. **Fiat On/Off-Ramp & KYC**:
   - `app/api/pouch/*` and `lib/server/pouch.ts`.
   - Holds partner key (`POUCHPAY_API_LIVE_KEY`).
   - Forwards Nigerian bank lookups, OTP dispatch, document submission, and virtual account generation to `api.pouchfinance.xyz`.

### The Problem

As articulated by platform engineering, **the frontend should strictly be concerned with UI, user interactions, and presentation logic**. Placing partner credentials, unmetered proxy endpoints, financial reconciliation, and cross-chain routing on the Next.js server runtime introduces:

1. **Security Vulnerabilities**: Partner API keys exposed in serverless container memory; risks of SSRF and unbounded rate limit exhaustion.
2. **Lack of Central Audit Logging**: Money-moving quotes and transactions execute without immutable ledger writes in the core platform database.
3. **Frontend Bloat**: The frontend client must maintain complex vendor quirks (such as filtering broken token routes or handling partner-specific error schemas).

---

## Decision

We will decouple the Crypto Exchange and Fiat Ramping services from the frontend server runtime and transition them to dedicated backend microservices under the WSWS API Gateway (`WSAPI_BASE_URL`):

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js Client)                │
│  • Pure UI & user state (QR codes, amount inputs, forms)    │
│  • Consumes clean, normalized domain endpoints via lib/api  │
│  • Zero partner API keys or vendor-specific retry quirks    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            (Privy Bearer JWT) │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  WSWS BACKEND API GATEWAY                   │
│                    (https://api.tsionark.com)               │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐┌──────────────────────────────┐
│  settlement-bridge-service  ││      fiat-ramp-service       │
│  (Cross-Chain & Exchange)   ││    (Pouch & Bank Rail)       │
│ • Holds Dextopus keys       ││ • Holds Pouch keys           │
│ • Curates valid token pairs ││ • Authenticated bank lookup  │
│ • Immutable DB audit ledger ││ • Webhook-based settlement   │
│ • Async status reconciliation│• Rate limiting & anti-abuse  │
└─────────────────────────────┘└──────────────────────────────┘
```

### Architecture Specifications

1. **Target Crypto Exchange Service (`settlement-bridge-service`)**:
   - Routes:
     - `GET /v1/bridge/tokens`: Returns verified, solver-supported tokens (eliminating client-side token blacklist workarounds).
     - `POST /v1/bridge/quote`: Computes validated quote bound to the authenticated user ID and wallet address.
     - `POST /v1/bridge/static-address`: Generates deposit address for major assets.
     - `GET /v1/bridge/status/:id`: Returns clean, normalized execution status (`PENDING`, `CONFIRMING`, `COMPLETED`, `FAILED`).
   - The frontend consumes these via `lib/api/services/tradeService.ts` or `lib/api/services/funds.ts`.

2. **Target Fiat Ramping Service (`fiat-ramp-service`)**:
   - Routes:
     - `GET /v1/fiat/rate`: Returns live USD/NGN conversion rates.
     - `POST /v1/fiat/verify-bank`: Authenticated, rate-limited bank resolution.
     - `POST /v1/fiat/kyc/*`: Gated Shared KYC flows linked to user ID.
     - `POST /v1/fiat/onramp` & `POST /v1/fiat/offramp`: Creates on/off-ramp orders backed by webhook fulfillment.
   - The frontend consumes these via `lib/api/services/funds.ts`.

3. **Frontend Role & Scope**:
   - **User Input & Presentation**: Display modal dialogs, bank dropdowns, input amount formatting, transaction status steppers.
   - **Zero Vendor Quirks**: Frontend receives normalized error codes and standard domain objects from the backend rather than raw upstream vendor JSON.
   - **Environment Cleanliness**: `DEXTOPUS_*` and `POUCHPAY_*` environment variables will be completely removed from the frontend deployment once the backend service cutover completes.

---

## Consequences & Benefits

- **Clear Separation of Concerns**: Frontend focuses exclusively on UX, responsive layouts, accessibility, and client-side reactive state.
- **Security Hardening**: No sensitive partner API keys live in frontend deployments.
- **Operational Resilience**: Vendor outages and rate limits are absorbed and reconciled by backend worker queues rather than crashing browser sessions.
