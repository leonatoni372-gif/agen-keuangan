// domain/laporan — render + statistik murni dari daftar transaksi.

import type { Transaksi } from "./transaksi";

export const rp = (n: number) => `Rp${Number(n).toLocaleString("id-ID")}`;

export function ringkas(rows: Transaksi[]): { masuk: number; keluar: number; saldo: number } {
  const sum = (j: string) =>
    rows.filter((t) => t.jenis === j).reduce((a, t) => a + Number(t.nominal), 0);
  const masuk = sum("pemasukan");
  const keluar = sum("pengeluaran");
  return { masuk, keluar, saldo: masuk - keluar };
}

export function toCsv(rows: Transaksi[]): string {
  const head = "id,jenis,kategori,nominal,tanggal,catatan";
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    head,
    ...rows.map((r) =>
      [r.id, r.jenis, r.kategori, r.nominal, r.tanggal, r.catatan].map(esc).join(",")
    ),
  ].join("\n");
}

export function renderLaporanMd(o: {
  tipe: "RUTIN" | "REKAP";
  wibHour: number;
  tanggal: string; // YYYY-MM-DD (WIB)
  rows: Transaksi[];
  ringkas?: { masuk: number; keluar: number };
}): { path: string; md: string } {
  const hh = String(o.wibHour).padStart(2, "0");
  const path_ = `04-Keuangan/laporan-${o.tanggal}-${hh}00.md`;
  const r = ringkas(o.rows);
  const masuk = o.ringkas?.masuk ?? r.masuk;
  const keluar = o.ringkas?.keluar ?? r.keluar;
  const tabel = o.rows
    .slice(0, 50)
    .map(
      (t) =>
        `| ${t.tanggal} | ${t.jenis} | ${t.kategori ?? "-"} | ${rp(t.nominal)} | ${t.catatan ?? "-"} |`
    )
    .join("\n");
  const md = `---
tags: [keuangan, laporan]
tipe: ${o.tipe}
jam_wib: "${hh}:00"
tanggal: ${o.tanggal}
jumlah_baris: ${o.rows.length}
---

# 💰 Laporan ${o.tipe} — ${hh}:00 WIB (${o.tanggal})

- Pemasukan: **${rp(masuk)}**
- Pengeluaran: **${rp(keluar)}**
- Saldo: **${rp(masuk - keluar)}**
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

// Deret harian n hari terakhir (urut naik) buat grafik, kunci = tanggal transaksi.
export function deretHarian(rows: Transaksi[], n = 14, hariIni = ""): {
  tanggal: string;
  masuk: number;
  keluar: number;
}[] {
  const base = hariIni || new Date().toISOString().slice(0, 10);
  const hari: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    hari.push(d.toISOString().slice(0, 10));
  }
  return hari.map((tanggal) => {
    const r = ringkas(rows.filter((t) => t.tanggal === tanggal));
    return { tanggal, masuk: r.masuk, keluar: r.keluar };
  });
}
