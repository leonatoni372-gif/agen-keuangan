import { NextResponse } from "next/server";
import { buatSid, pinCocok } from "@/lib/infra/auth";
import { boleh, ipDari } from "@/lib/infra/ratelimit";

export async function POST(req: Request) {
  if (!boleh(`login:${ipDari(req.headers)}`, 5, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "kebanyakan percobaan, coba lagi 5 menit" }, { status: 429 });
  }
  const { pin } = await req.json().catch(() => ({} as { pin?: unknown }));
  if (!pinCocok(pin)) {
    await new Promise((r) => setTimeout(r, 500)); // hambat brute force
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sid", await buatSid(pin as string), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
    ...(process.env.NODE_ENV === "production" ? { secure: true } : {}),
  });
  return res;
}

export const dynamic = "force-dynamic";
