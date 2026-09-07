import { NextResponse } from "next/server";
import { hapusTransaksi } from "@/lib/infra/toko";

export async function DELETE(req: Request) {
  const { id } = await req.json().catch(() => ({} as { id?: unknown }));
  const ok = await hapusTransaksi(typeof id === "string" ? id : "").catch(() => false);
  if (!ok) return NextResponse.json({ error: "id tidak ketemu" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
