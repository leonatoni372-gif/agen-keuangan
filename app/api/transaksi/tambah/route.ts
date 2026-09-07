import { NextResponse } from "next/server";
import { validTransaksi } from "@/lib/domain/transaksi";
import { tambahTransaksi } from "@/lib/infra/toko";

export async function POST(req: Request) {
  const v = validTransaksi(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const baru = await tambahTransaksi(v.data!);
    return NextResponse.json({ ok: true, transaksi: baru });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal simpan" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
