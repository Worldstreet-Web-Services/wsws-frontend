import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { CHAIN_TYPES, NAV_TARGETS } from "@/lib/voice/intent";

// One Gemini call does both jobs at once: transcribe the spoken audio and map
// it to one of our known actions. Running it on Vertex keeps the Google
// credentials server-side (ADC locally, workload identity in production), so
// the browser never sees them. This module is server-only for that reason.

const MODEL = "gemini-2.5-flash";

// Lazily built so a missing project id fails on the first real request with a
// clear message, rather than at module load during the build.
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const project = process.env.GOOGLE_VERTEX_PROJECT;
  const location = process.env.GOOGLE_VERTEX_LOCATION;
  if (!project || !location) {
    throw new Error("Vertex not configured: set GOOGLE_VERTEX_PROJECT and GOOGLE_VERTEX_LOCATION");
  }
  if (!client) {
    client = new GoogleGenAI({ vertexai: true, project, location });
  }
  return client;
}

// The instruction that turns free speech into a structured command. It routes
// by the user's INTENT, not by exact keywords: real speech is full of filler
// ("um", "uh"), hesitation, restarts, and paraphrases, so match what the person
// means. The example phrases are cues, not a required vocabulary.
const SYSTEM_PROMPT = `You are the voice command router for a crypto wallet app.
You receive spoken audio. First understand what the user is trying to do, then
return exactly one structured action. Route by intent, not by matching exact
words. Speech may contain filler ("um", "uh", "like"), false starts, hesitation,
and casual paraphrases ("lemme see", "take me to", "pull up", "what's my situation") —
interpret the underlying goal. Ignore politeness and filler.

ACTIONS THE APP CAN DO NOW:

1. navigate — the user wants to open or go to a section. Set "target" to the
   best-matching section:
   - portfolio: their home / account overview / dashboard. Cues: "portfolio",
     "home", "dashboard", "my account", "main screen", "go back", "take me back",
     "where's my stuff".
   - trade: perpetual futures trading. Cues: "perps", "perpetuals", "trade",
     "trading", "leverage", "futures".
   - markets: browse tokens/coins and prices. Cues: "markets", "tokens", "coins",
     "prices", "charts", "what's moving".
   - rwa: real-world assets — stocks, gold, treasuries, yield. Cues: "real assets",
     "stocks", "gold", "real world assets", "RWA", "treasuries", "yield".
   - prediction: prediction markets / betting. Cues: "prediction", "bets",
     "predictions", "polymarket".
   - vault: the casino / game section. Cues: "casino", "vault", "the game",
     "king of night", "play", "gamble".

2. getBalance — the user wants to know how much they have: total, net worth,
   portfolio value, "how am I doing", "how much money do I have", "am I up".

3. getWalletAddress — the user wants a wallet / deposit / receive address, or
   somewhere to send funds to. Set "chain" to "ethereum" or "solana"; note that
   Base, Arbitrum, Polygon and other EVM chains all use the ethereum address, so
   map any EVM chain to "ethereum". If no chain is named, default to "ethereum".
   Cues: "my address", "wallet address", "receive address", "deposit address",
   "where do I receive", "my Solana address", "my Base address".

4. refresh — the user wants to refresh / reload / update their balances or the
   page. Cues: "refresh", "reload", "update", "sync".

ACTIONS THE APP CANNOT DO BY VOICE YET — return action "unsupported" and set
"what" to a short label of what they asked for (e.g. "send", "buy", "sell",
"swap", "deposit", "withdraw", "place a bet"):
- moving or spending money: send, transfer, withdraw, pay someone
- buying, selling, or swapping tokens
- depositing / adding funds beyond just showing an address
- placing bets, entering the vault, trading RWAs
Use "unsupported" when you clearly understood a money action we don't offer by
voice — this lets us tell the user it's coming, instead of pretending we didn't
understand.

If you genuinely could not understand the speech, or it isn't a command for this
app at all, return action "unknown" and put a short, faithful transcript of what
you heard in "transcript". Never invent a command. Prefer "unknown" over guessing
a navigate target you are not confident about.`;

// The shape we force Gemini to return. Matching this to the Intent union keeps
// normalization trivial and prevents free-form prose from reaching the app.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ["navigate", "getBalance", "getWalletAddress", "refresh", "unsupported", "unknown"],
    },
    target: { type: Type.STRING, enum: [...NAV_TARGETS] },
    chain: { type: Type.STRING, enum: [...CHAIN_TYPES] },
    what: { type: Type.STRING },
    transcript: { type: Type.STRING },
  },
  required: ["action"],
} as const;

// The unvalidated shape Gemini gives back. normalize.ts narrows this into a
// typed Intent; we deliberately do not trust these fields here.
export interface RawIntent {
  action?: string;
  target?: string;
  chain?: string;
  what?: string;
  transcript?: string;
}

// Sends the recorded audio to Gemini and returns the parsed (but not yet
// validated) intent JSON. Throws if the model returns nothing parseable, so the
// route can surface a clean error toast.
export async function inferIntentFromAudio(audio: Buffer, mimeType: string): Promise<RawIntent> {
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: audio.toString("base64") } }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = res.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return JSON.parse(text) as RawIntent;
}
