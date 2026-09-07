// infra/auth — PIN stateless: cookie sid = HMAC(CRON_SECRET, "pin:"+PIN).
// Tanpa DB/sesi — cocok untuk 1 pengguna. Web Crypto agar jalan di edge + node.

const enc = new TextEncoder();

function hex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function buatSid(pin: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode((process.env.CRON_SECRET || "") + ":dashboard"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode("pin:" + pin)));
}

function sama(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function sidCocok(cookie: string): Promise<boolean> {
  const pin = process.env.DASHBOARD_PIN || "";
  if (!cookie || !pin) return false;
  return sama(cookie, await buatSid(pin));
}

export const pinCocok = (pin: unknown): boolean =>
  typeof pin === "string" && !!process.env.DASHBOARD_PIN && sama(pin, process.env.DASHBOARD_PIN);
