import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sidCocok } from "./lib/auth";
import { boleh, ipDari } from "./lib/ratelimit";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Tulis dibatasi walau sudah login (anti spam commit ke vault)
  if (req.method !== "GET" && isApi && !boleh(`tulis:${ipDari(req.headers)}`, 30, 3600 * 1000)) {
    return NextResponse.json({ error: "batas tulis tercapai, coba lagi nanti" }, { status: 429 });
  }

  if (await sidCocok(req.cookies.get("sid")?.value ?? "")) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/keuangan/:path*", "/api/transaksi/:path*", "/api/obsidian/:path*"],
};
