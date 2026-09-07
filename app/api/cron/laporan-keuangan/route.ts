import { NextResponse } from "next/server";
import { jalankanLaporan } from "@/lib/layanan/keuangan";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const hasil = await jalankanLaporan(new Date());
  if ("error" in hasil) return NextResponse.json({ error: hasil.error }, { status: 500 });
  return NextResponse.json(hasil);
}

export const dynamic = "force-dynamic";
