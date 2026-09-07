// infra/obsidian — baca/tulis vault. Lokal saat dev, GitHub saat production.

import { promises as fs } from "fs";
import path from "path";
import { VAULT_REPO, tokenGithub, adaTokenGithub, githubGet, pushKeGithub } from "./github";
import { renderLaporanMd } from "../domain/laporan";
import type { Transaksi } from "../domain/transaksi";

const VAULT = () => process.env.OBSIDIAN_VAULT_PATH || String.raw`D:\ALTER BRAIN`;

export function sanitasiPath(p: string): string | null {
  if (!p || p.length > 200) return null;
  const n = p.replace(/\\/g, "/").trim().replace(/^\/+/, "");
  if (!n.endsWith(".md") || n.includes("..")) return null;
  return n;
}

export async function bacaCatatan(rel: string): Promise<{ content: string; sumber: "lokal" | "github" }> {
  // 1. lokal dulu (dev di PC vault)
  try {
    const full = path.join(VAULT(), rel);
    if (path.relative(VAULT(), full).startsWith("..")) throw new Error("traversal");
    const content = await fs.readFile(full, "utf8");
    return { content, sumber: "lokal" };
  } catch {
    /* jatuh ke github */
  }
  // 2. github (raw; repo privat perlu token)
  const headers: Record<string, string> = adaTokenGithub()
    ? { Authorization: `Bearer ${tokenGithub()}` }
    : {};
  const r = await fetch(`https://raw.githubusercontent.com/${VAULT_REPO}/main/${rel}`, { headers });
  if (!r.ok) throw new Error(`catatan tidak ketemu (${r.status})`);
  return { content: await r.text(), sumber: "github" };
}

export function templateDaily(tanggal: string): string {
  return `---\ntags: [daily]\ntanggal: ${tanggal}\n---\n\n# ${tanggal}\n\n## 🎯 Fokus hari ini\n- [ ]\n\n## 📝 Log\n-\n\n## 💰 Keuangan\n`;
}

// Tempel section ke daily note di bawah judul h2 tertentu, idempoten via penandaUnik.
export async function tempelDaily(
  tanggal: string,
  penandaUnik: string,
  judul: string,
  section: string
): Promise<boolean> {
  const dailyPath = `01-Daily/${tanggal}.md`;
  const cur = await githubGet(dailyPath).catch(() => null);
  const base = cur?.content ?? templateDaily(tanggal);
  if (base.includes(penandaUnik)) return false;
  const next = base.includes(judul) ? base + section : base + `\n${judul}\n` + section;
  await pushKeGithub(dailyPath, next, `agen: daily ${tanggal} ${penandaUnik}`);
  return true;
}

// Dipanggil cron setelah email terkirim. Tak pernah throw — kembalikan status string.
export async function pushLaporanKeObsidian(o: {
  tipe: "RUTIN" | "REKAP";
  wibHour: number;
  tanggal: string;
  rows: Transaksi[];
  ringkas?: { masuk: number; keluar: number };
}): Promise<string> {
  if (!adaTokenGithub()) return "obsidian skip: GITHUB_TOKEN kosong";
  try {
    const hh = String(o.wibHour).padStart(2, "0");
    const { path: lapPath, md } = renderLaporanMd(o);
    await pushKeGithub(lapPath, md, `keuangan: laporan ${o.tipe} ${o.tanggal} ${hh}:00`);
    const masuk = o.ringkas?.masuk ?? 0;
    const keluar = o.ringkas?.keluar ?? 0;
    await tempelDaily(
      o.tanggal,
      lapPath.replace(/\.md$/, ""),
      "## 💰 Keuangan",
      `\n### 💰 ${hh}:00 WIB — ${o.tipe}\n` +
        `- Masuk: ${masuk.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })} · Keluar: ${keluar.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })} · Baris: ${o.rows.length}\n` +
        `- Detail: [[${lapPath.replace(/\.md$/, "")}]]\n`
    );
    return `obsidian ok: ${lapPath}`;
  } catch (e) {
    return `obsidian gagal: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export const VAULT_NAME = process.env.OBSIDIAN_VAULT_NAME || "ALTER BRAIN";
export const obsidianUrl = (filePathNoExt: string) =>
  `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(filePathNoExt)}`;
