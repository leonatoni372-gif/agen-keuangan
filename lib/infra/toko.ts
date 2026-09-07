// infra/toko — persistence JSON di GitHub (transaksi ikut ke-vault Obsidian).

import { VAULT_REPO, APP_REPO, adaTokenGithub, githubGet, ubahGithub } from "./github";
import type { Transaksi } from "../domain/transaksi";

const TOKO_PATH = "04-Keuangan/transaksi.json";
const LOG_PATH = "laporan_log.json";

export type EntriLog = { periode: string; tipe: string; penerima: string; status: string | null };

const aman = <T>(rows: unknown): T[] => (Array.isArray(rows) ? (rows as T[]) : []);

export async function bacaTransaksi(): Promise<Transaksi[]> {
  if (!adaTokenGithub()) return [];
  // via Contents API (raw.githubusercontent cache-nya bandel untuk tulis-baca cepat)
  const cur = await githubGet(TOKO_PATH, VAULT_REPO).catch(() => null);
  return cur ? aman<Transaksi>(JSON.parse(cur.content)) : [];
}

export async function tambahTransaksi(
  d: Omit<Transaksi, "id" | "created_at">
): Promise<Transaksi> {
  const baru: Transaksi = {
    ...d,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    created_at: new Date().toISOString(),
  };
  await ubahGithub<Transaksi[]>(VAULT_REPO, TOKO_PATH, `keuangan: +${d.jenis} ${d.nominal}`, (cur) => [
    ...aman<Transaksi>(cur),
    baru,
  ]);
  return baru;
}

export async function hapusTransaksi(id: string): Promise<boolean> {
  if (!id || id.length > 32) return false;
  let ketemu = false;
  await ubahGithub<Transaksi[]>(VAULT_REPO, TOKO_PATH, `keuangan: hapus ${id}`, (cur) => {
    const rows = aman<Transaksi>(cur);
    const next = rows.filter((t) => t.id !== id);
    ketemu = next.length !== rows.length;
    return next;
  });
  return ketemu;
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
  ).catch((err) => console.error("catatLog gagal:", err instanceof Error ? err.message : err));
}
