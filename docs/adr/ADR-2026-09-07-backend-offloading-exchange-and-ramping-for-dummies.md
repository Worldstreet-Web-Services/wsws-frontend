# ADR-2026-09-07: Offloading Crypto Exchange and Fiat Ramping to Backend Services (For Dummies)

## What is this about?

Currently, the web browser application (the frontend) is doing heavy backend work:

1. It holds secret partner passwords and API keys for **Dextopus** (cross-chain crypto swaps) and **Pouch Finance** (Nigerian fiat on/off-ramp).
2. When you swap crypto or convert naira to crypto, the frontend server talks directly to external third parties and tries to manage complex retries, errors, and route checks.

This is risky and slows down the app.

---

## Why are we changing it?

1. **Security**: Secret API keys should never be stored in the website frontend. If someone finds an exploit, those keys could be misused.
2. **Proper Separation of Concerns**: The frontend's job is to look great, respond quickly to clicks, validate user input, and display clean status screens. The backend's job is to talk to financial providers, track money movements in a database, and enforce security limits.
3. **Fewer Bugs & Errors**: Right now, if Dextopus has broken routes or rejects tokens, the frontend has to write custom workarounds. Moving this to the backend means the backend tests and provides only working tokens to the frontend.

---

## What will the new architecture look like?

```
[ User in Web App / Mobile ]
           │
           │ Sends request: "I want to deposit 100 USDT"
           ▼
[ WSWS Backend Gateway (api.tsionark.com) ]
           │
           ├──► [ Settlement & Bridge Service ] ──► talks to Dextopus
           └──► [ Fiat Ramping Service ]        ──► talks to Pouch Finance
```

- **Frontend**: Shows the user clean forms, input boxes, QR codes, and loading spinners. It asks our backend gateway for quotes and deposit addresses.
- **Backend**: Safely handles the API keys, calculates the best routes, records transactions in our audit ledger, and returns clean, easy-to-read answers to the frontend.

---

## What does this mean for the team?

- **Frontend Developers**: No longer need to write complex vendor-specific code or handle messy third-party errors. We just call standard endpoints like `/v1/bridge` or `/v1/ramp`.
- **Backend Developers**: Have full visibility and logging of all bridge trades and fiat conversions.
- **Users**: A faster, more reliable deposit and withdrawal experience with zero confusing provider error popups.
