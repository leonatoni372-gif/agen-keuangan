// domain/transaksi — tipe + validasi murni, tanpa I/O.

export type Transaksi = {
  id: string;
  jenis: "pemasukan" | "pengeluaran";
  kategori: string | null;
  nominal: number;
  tanggal: string; // YYYY-MM-DD
  catatan: string | null;
  created_at: string; // ISO
};

export function validTransaksi(b: unknown): {
  ok: boolean;
  data?: Omit<Transaksi, "id" | "created_at">;
  error?: string;
} {
  const v = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  if (v.jenis !== "pemasukan" && v.jenis !== "pengeluaran")
    return { ok: false, error: "jenis harus pemasukan/pengeluaran" };
  const nominal = Number(v.nominal);
  if (!Number.isFinite(nominal) || nominal < 0 || nominal > 1e12)
    return { ok: false, error: "nominal tidak valid" };
  if (typeof v.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.tanggal))
    return { ok: false, error: "tanggal harus YYYY-MM-DD" };
  const s = (x: unknown, max: number) =>
    typeof x !== "string" ? null : x.trim().slice(0, max) || null;
  return {
    ok: true,
    data: {
      jenis: v.jenis,
      kategori: s(v.kategori, 60),
      nominal: Math.floor(nominal),
      tanggal: v.tanggal,
      catatan: s(v.catatan, 280),
    },
  };
}
