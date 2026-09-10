/**
 * Check a REAL Razorpay webhook delivery against the secrets in your env file.
 *
 * Razorpay signs the exact bytes it sent, so if you take the body + signature
 * from an actual delivery (Razorpay Dashboard → Settings → Webhooks → your
 * webhook → recent deliveries) and it verifies here, your configured secret is
 * provably the same one Razorpay is signing with. No tunnel, no deploy.
 *
 *   pnpm tsx src/scripts/verifyWebhookSecret.ts --body payload.json --signature <hex>
 *
 * Flags:
 *   --body <file>        file containing the raw request body, saved verbatim
 *   --signature <hex>    the x-razorpay-signature header from that delivery
 *   --secret <value>     check one explicit secret instead of the configured set
 *   --post <url>         also replay the delivery at a running local server,
 *                        e.g. --post http://127.0.0.1:5009/api/webhook/razorpay
 *
 * NODE_ENV picks which env file's secrets are checked (development by default).
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { env } from "../config/env";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const bodyPath = flag("body");
const signature = flag("signature")?.trim().toLowerCase();
const explicitSecret = flag("secret");
const postUrl = flag("post");

if (!bodyPath || !signature) {
  console.error(
    "Usage: pnpm tsx src/scripts/verifyWebhookSecret.ts --body <file> --signature <hex> [--secret <v>] [--post <url>]",
  );
  process.exit(1);
}
if (!fs.existsSync(bodyPath)) {
  console.error(`No such file: ${bodyPath}`);
  process.exit(1);
}

// Read as bytes — never parse. A round-trip through JSON would change the bytes
// and invalidate the signature, which is the whole thing we are testing.
const raw = fs.readFileSync(bodyPath);

const candidates: Array<[string, string]> = explicitSecret
  ? [["--secret (explicit)", explicitSecret]]
  : [
      ["RAZORPAY_WEBHOOK_SECRET", env.razorpay.webhookSecret],
      ["RAZORPAY_4DHAM_WEBHOOK_SECRET", env.razorpay.fourDhamWebhookSecret],
      ["RAZORPAY_BB_WEBHOOK_SECRET", env.razorpay.bbWebhookSecret],
      ["RAZORPAY_GAUSEVA_WEBHOOK_SECRET", env.razorpay.gauSevaWebhookSecret],
    ];

const hmac = (secret: string, bytes: Buffer): string =>
  crypto.createHmac("sha256", secret).update(bytes).digest("hex");

// Editors love appending a newline when you paste-and-save a payload; that single
// byte breaks the HMAC. Detect it so the failure is explained, not mysterious.
const trimmed = Buffer.from(raw.toString("utf8").replace(/\s+$/, ""), "utf8");
const differsByTrailingWhitespace = !raw.equals(trimmed);

console.log(`\nmode        : ${env.nodeEnv}  (NODE_ENV=${env.nodeEnv} → .env.${env.nodeEnv})`);
console.log(`body        : ${bodyPath}  (${raw.length} bytes)`);
console.log(`signature   : ${signature}\n`);

const matches: string[] = [];
let matchedTrimmed: string | null = null;

for (const [name, secret] of candidates) {
  if (!secret) {
    console.log(`  ${"(unset)".padEnd(12)} ${name}`);
    continue;
  }
  const exact = hmac(secret, raw) === signature;
  if (exact) matches.push(name);
  let note = "";
  if (!exact && differsByTrailingWhitespace && hmac(secret, trimmed) === signature) {
    matchedTrimmed ??= name;
    note = "  ← matches WITHOUT the trailing newline in your file";
  }
  console.log(`  ${(exact ? "MATCH" : "no match").padEnd(12)} ${name}${note}`);
}

const matched = matches[0] ?? null;
console.log("");
if (matched) {
  console.log(`✅ Verified. Razorpay signed this with the value in ${matched}.`);
  console.log("   That secret is correct — live deliveries to this endpoint will pass.");
  if (matches.length > 1) {
    console.log(
      `   (${matches.length} keys share this value: ${matches.join(", ")} — expected if you\n` +
        "    reuse one secret across webhooks, but it means this check cannot tell them apart.)",
    );
  }
} else if (matchedTrimmed) {
  console.log(`⚠️  The secret in ${matchedTrimmed} is CORRECT, but your saved file has a`);
  console.log("   trailing newline that Razorpay did not send. Re-save it without one;");
  console.log("   nothing is wrong with your configuration.");
} else {
  console.log("❌ No configured secret produces this signature.");
  console.log("   Either the env value differs from the webhook's secret in the Razorpay");
  console.log("   dashboard, or the body was altered when saved (re-formatted, re-indented,");
  console.log("   or pasted with smart quotes). Save the payload verbatim and retry.");
}

if (postUrl) {
  void (async () => {
    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": signature },
      body: new Uint8Array(raw),
    });
    console.log(`\nreplayed at ${postUrl} → HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  })();
}
