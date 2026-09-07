// infra/ratelimit — rate limit in-memory per instance.
// ponytail: best-effort di serverless (tiap instance punya hitungan sendiri).
// Cukup untuk pribadi; ganti KV/Upstash saat butuh batas global yang keras.

const hits = new Map<string, number[]>();

export function boleh(key: string, maks: number, jendelaMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < jendelaMs);
  if (arr.length >= maks) return false;
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export const ipDari = (h: Headers): string =>
  h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
