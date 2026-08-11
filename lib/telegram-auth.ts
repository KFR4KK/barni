import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Telegram Login Widget — NOT OAuth2. The widget itself (a <script> tag
// Telegram serves) handles the actual "log in with Telegram" UI and
// redirects/calls back with a signed payload; our only job is to verify
// that signature server-side before trusting any of it. Algorithm is
// Telegram's own (https://core.telegram.org/widgets/login#checking-authorization):
//
//   1. Take every field except `hash`, sort keys alphabetically,
//      join as "key=value" lines.
//   2. secret_key = SHA256(bot_token) — raw bytes, not hex.
//   3. computed_hash = HMAC-SHA256(secret_key, that joined string), hex.
//   4. Compare computed_hash to the `hash` field Telegram sent.
//
// A forged payload is only possible with the bot token itself, so this
// is exactly as secure as the token stays secret — same trust model as
// any other server-side secret in this app.

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// How old a login payload can be before it's rejected — this is what
// stops someone from replaying a captured, still-validly-signed payload
// indefinitely. 24 hours matches Telegram's own reference implementation
// examples; there's nothing magic about the number beyond "generous
// enough for real use, short enough to bound replay risk".
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export function verifyTelegramAuth(data: TelegramAuthData): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[telegram-auth] TELEGRAM_BOT_TOKEN is not set");
    return false;
  }

  const { hash, ...fields } = data;
  if (!hash) return false;

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key as keyof typeof fields]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const computedBuffer = Buffer.from(computedHash, "hex");
  const providedBuffer = Buffer.from(hash, "hex");
  if (computedBuffer.length !== providedBuffer.length) return false;
  if (!timingSafeEqual(computedBuffer, providedBuffer)) return false;

  const ageSeconds = Date.now() / 1000 - data.auth_date;
  if (ageSeconds < 0 || ageSeconds > MAX_AUTH_AGE_SECONDS) return false;

  return true;
}
