import { githubGet, ubahGithub, adaTokenGithub } from "./obsidian";

// Toko GitHub gantikan Supabase: transaksi hidup di vault (bisa dibaca Obsidian),
// log laporan di repo agen-keuangan. Tanpa akun/klik tambahan.

// ponytail: JSON polos via Contents API, tanpa DB. Cukup untuk trafik pribadi.

const VAULT_REPO = process.env.GITHUB_REPO || "leonatoni372-gif/alter-brain";
const APP_REPO = process.env.APP_REPO || "leonatoni372-gif/agen-keuangan";
const TOKO_PATH = "04-Keuangan/transaksi.json";
const LOG_PATH = "laporan_log.json";

export type Transaksi = {
  id: string;
  jenis: "pemasukan" | "pengeluaran";
  kategori: string | null;
  nominal: number;
  tanggal: string; // YYYY-MM-DD
  catatan: string | null;
  created_at: string; // ISO
};

export type EntriLog = { periode: string; tipe: string; penerima: string; status: string | null };

const aman = <T,>(rows: unknown): T[] => (Array.isArray(rows) ? (rows as T[]) : []);

export async function bacaTransaksi(): Promise<Transaksi[]> {
  if (!adaTokenGithub()) return [];
  // raw lebih cepat; fallback API kalau repo privat bermasalah
  const r = await fetch(`https://raw.githubusercontent.com/${VAULT_REPO}/main/${TOKO_PATH}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!r.ok) {
    const cur = await githubGet(TOKO_PATH, VAULT_REPO).catch(() => null);
    return cur ? aman<Transaksi>(JSON.parse(cur.content)) : [];
  }
  return aman<Transaksi>(await r.json());
}

export function validTransaksi(b: unknown): { ok: boolean; data?: Omit<Transaksi, "id" | "created_at">; error?: string } {
  const v = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  if (v.jenis !== "pemasukan" && v.jenis !== "pengeluaran") return { ok: false, error: "jenis harus pemasukan/pengeluaran" };
  const nominal = Number(v.nominal);
  if (!Number.isFinite(nominal) || nominal < 0 || nominal > 1e12) return { ok: false, error: "nominal tidak valid" };
  if (typeof v.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.tanggal)) return { ok: false, error: "tanggal harus YYYY-MM-DD" };
  const s = (x: unknown, max: number) =>
    typeof x !== "string" ? null : x.trim().slice(0, max) || null;
  return {
    ok: true,
    data: { jenis: v.jenis, kategori: s(v.kategori, 60), nominal: Math.floor(nominal), tanggal: v.tanggal, catatan: s(v.catatan, 280) },
  };
}

export async function tambahTransaksi(d: Omit<Transaksi, "id" | "created_at">): Promise<Transaksi> {
  const baru: Transaksi = {
    ...d,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    created_at: new Date().toISOString(),
  };
  await ubahGithub<Transaksi[]>(VAULT_REPO, TOKO_PATH, `keuangan: +${d.jenis} ${d.nominal}`, (cur) => [...aman<Transaksi>(cur), baru]);
  return baru;
}

export async function bacaLog(limit = 5): Promise<EntriLog[]> {
  if (!adaTokenGithub()) return [];
  const cur = await githubGet(LOG_PATH, APP_REPO).catch(() => null);
  const rows = cur ? aman<EntriLog>(JSON.parse(cur.content)) : [];
  return rows.slice(-limit).reverse();
}

export async function catatLog(e: EntriLog): Promise<void> {
  await ubahGithub<EntriLog[]>(APP_REPO, LOG_PATH, `log: ${e.tipe} ${e.periode.slice(0, 16)}`, (cur) =>
    [...aman<EntriLog>(cur), e].slice(-200)
  ).catch(() => {});
}
