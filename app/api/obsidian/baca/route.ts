import { NextResponse } from "next/server";
import { bacaCatatan, sanitasiPath } from "@/lib/obsidian";

export async function GET(req: Request) {
  const rel = sanitasiPath(new URL(req.url).searchParams.get("path") ?? "");
  if (!rel) return NextResponse.json({ error: "path .md tidak valid (tanpa ..)" }, { status: 400 });
  try {
    const { content, sumber } = await bacaCatatan(rel);
    return NextResponse.json({ path: rel, sumber, content });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal baca" }, { status: 404 });
  }
}

export const dynamic = "force-dynamic";
