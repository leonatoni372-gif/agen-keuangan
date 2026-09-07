import { promises as fs } from "fs";
import path from "path";

// ponytail: fetch native + fs node, tanpa dep baru. Vercel tak bisa tulis D:\, jadi tulis via GitHub Contents API (obsidian-git di desktop yang pull).

const REPO = process.env.GITHUB_REPO || "leonatoni372-gif/alter-brain";
const TOKEN = () => process.env.GITHUB_TOKEN || "";
export const adaTokenGithub = () => TOKEN() !== "";
const VAULT = () =>
  process.env.OBSIDIAN_VAULT_PATH || String.raw`D:\ALTER BRAIN`;

export function sanitasiPath(p: string): string | null {
  if (!p || p.length > 200) return null;
  const n = p.replace(/\\/g, "/").trim().replace(/^\/+/, "");
  if (!n.endsWith(".md") || n.includes("..")) return null;
  return n;
}

type Baris = { jenis: string; kategori: string | null; nominal: number; tanggal: string; catatan: string | null };

export function renderLaporanMd(o: {
  tipe: "RUTIN" | "REKAP";
  wibHour: number;
  tanggal: string; // YYYY-MM-DD (WIB)
  rows: Baris[];
  ringkas?: { masuk: number; keluar: number };
}): { path: string; md: string } {
  const hh = String(o.wibHour).padStart(2, "0");
  const path_ = `04-Keuangan/laporan-${o.tanggal}-${hh}00.md`;
  const rp = (n: number) => `Rp${Number(n).toLocaleString("id-ID")}`;
  const saldo = (o.ringkas?.masuk ?? 0) - (o.ringkas?.keluar ?? 0);
  const tabel = o.rows
    .slice(0, 50)
    .map((r) => `| ${r.tanggal} | ${r.jenis} | ${r.kategori ?? "-"} | ${rp(r.nominal)} | ${r.catatan ?? "-"} |`)
    .join("\n");
  const md = `---
tags: [keuangan, laporan]
tipe: ${o.tipe}
jam_wib: "${hh}:00"
tanggal: ${o.tanggal}
jumlah_baris: ${o.rows.length}
---

# 💰 Laporan ${o.tipe} — ${hh}:00 WIB (${o.tanggal})

- Pemasukan: **${rp(o.ringkas?.masuk ?? 0)}**
- Pengeluaran: **${rp(o.ringkas?.keluar ?? 0)}**
- Saldo: **${rp(saldo)}**
- Baris: ${o.rows.length}${o.rows.length > 50 ? " (50 pertama, lengkap di CSV email)" : ""}

## Transaksi
| Tanggal | Jenis | Kategori | Nominal | Catatan |
|---|---|---|---|---|
${tabel || "| - | - | - | - | - |"}

---
*Otomatis dari agen-keuangan · [[Home]] · [[01-Daily/${o.tanggal}]]*
`;
  return { path: path_, md };
}

export async function githubGet(pathInRepo: string, repo = REPO): Promise<{ sha: string; content: string } | null> {
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pathInRepo).replace(/%2F/g, "/")}`, {
    headers: { Authorization: `Bearer ${TOKEN()}`, Accept: "application/vnd.github+json" },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`github GET ${r.status}`);
  const j = (await r.json()) as { sha: string; content?: string };
  const content = j.content ? Buffer.from(j.content.replace(/\n/g, ""), "base64").toString("utf8") : "";
  return { sha: j.sha, content };
}

export async function pushKeGithub(pathInRepo: string, content: string, message: string, repo = REPO) {
  const cur = await githubGet(pathInRepo, repo).catch(() => null);
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    ...(cur ? { sha: cur.sha } : {}),
  };
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pathInRepo).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`github PUT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return cur ? "updated" : "created";
}

// Tulis dengan transform baca-ubah-tulis + 1x retry kalau sha basi (tulis barengan).
export async function ubahGithub<T>(repo: string, pathInRepo: string, message: string, fn: (cur: T | null) => T): Promise<T> {
  for (let i = 0; i < 2; i++) {
    const cur = await githubGet(pathInRepo, repo).catch(() => null);
    const next = fn(cur ? (JSON.parse(cur.content) as T) : null);
    try {
      const body: Record<string, unknown> = {
        message,
        content: Buffer.from(JSON.stringify(next), "utf8").toString("base64"),
        ...(cur ? { sha: cur.sha } : {}),
      };
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pathInRepo).replace(/%2F/g, "/")}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${TOKEN()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 409 || r.status === 422) continue; // sha basi, coba sekali lagi
      if (!r.ok) throw new Error(`github PUT ${r.status}`);
      return next;
    } catch (e) {
      if (i === 1) throw e;
    }
  }
  throw new Error("github tulis gagal setelah retry");
}

function templateDaily(tanggal: string): string {
  return `---\ntags: [daily]\ntanggal: ${tanggal}\n---\n\n# ${tanggal}\n\n## 🎯 Fokus hari ini\n- [ ]\n\n## 📝 Log\n-\n\n## 💰 Keuangan\n`;
}

// Dipanggil cron setelah email terkirim. Tak pernah throw — kembalikan status string.
export async function pushLaporanKeObsidian(o: {
  tipe: "RUTIN" | "REKAP";
  wibHour: number;
  tanggal: string;
  rows: Baris[];
  ringkas?: { masuk: number; keluar: number };
}): Promise<string> {
  if (!TOKEN()) return "obsidian skip: GITHUB_TOKEN kosong";
  try {
    const hh = String(o.wibHour).padStart(2, "0");
    const { path: lapPath, md } = renderLaporanMd(o);
    await pushKeGithub(lapPath, md, `keuangan: laporan ${o.tipe} ${o.tanggal} ${hh}:00`);
    // Append ke daily (idempoten: skip kalau file laporan sudah disebut)
    const dailyPath = `01-Daily/${o.tanggal}.md`;
    const cur = await githubGet(dailyPath).catch(() => null);
    const base = cur?.content ?? templateDaily(o.tanggal);
    const namaFile = lapPath.split("/").pop()!.replace(/\.md$/, "");
    if (!base.includes(namaFile)) {
      const rp = (n: number) => `Rp${Number(n).toLocaleString("id-ID")}`;
      const baris =
        `\n### 💰 ${hh}:00 WIB — ${o.tipe}\n` +
        `- Masuk: ${rp(o.ringkas?.masuk ?? 0)} · Keluar: ${rp(o.ringkas?.keluar ?? 0)} · Baris: ${o.rows.length}\n` +
        `- Detail: [[${lapPath.replace(/\.md$/, "")}]]\n`;
      const next = base.includes("## 💰 Keuangan") ? base + baris : base + "\n## 💰 Keuangan" + baris;
      await pushKeGithub(dailyPath, next, `keuangan: daily ${o.tanggal} +${hh}`);
    }
    return `obsidian ok: ${lapPath}`;
  } catch (e) {
    return `obsidian gagal: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function bacaCatatan(rel: string): Promise<{ content: string; sumber: "lokal" | "github" }> {
  // 1. lokal dulu (dev di PC vault)
  try {
    const full = path.join(VAULT(), rel);
    if (path.relative(VAULT(), full).startsWith("..")) throw new Error("traversal");
    const content = await fs.readFile(full, "utf8");
    return { content, sumber: "lokal" };
  } catch { /* jatuh ke github */ }
  // 2. github (raw; private repo perlu token)
  const headers: Record<string, string> = TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {};
  const r = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${rel}`, { headers });
  if (!r.ok) throw new Error(`catatan tidak ketemu (${r.status})`);
  return { content: await r.text(), sumber: "github" };
}

export const VAULT_NAME = process.env.OBSIDIAN_VAULT_NAME || "ALTER BRAIN";
export const obsidianUrl = (filePathNoExt: string) =>
  `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(filePathNoExt)}`;
