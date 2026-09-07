// layanan/keuangan — orkestrasi laporan: baca toko → email → push Obsidian → catat log.
// Route cron tinggal guard + panggil ini (tipis, tanpa logika).

import { ADMIN_EMAIL, getResend } from "@/lib/infra/email";
import { getWibHour, jadwalUntukJam, tanggalWib } from "@/lib/domain/waktu";
import { ringkas, toCsv } from "@/lib/domain/laporan";
import { pushLaporanKeObsidian } from "@/lib/infra/obsidian";
import { bacaTransaksi, catatLog } from "@/lib/infra/toko";

export type HasilLaporan =
  | { skipped: true; wibHour: number }
  | { ok: true; type: "RUTIN" | "REKAP"; wibHour: number; rows: number; obsidian: string }
  | { error: string; wibHour: number };

export async function jalankanLaporan(now = new Date()): Promise<HasilLaporan> {
  const wibHour = getWibHour(now);
  const { run, type } = jadwalUntukJam(wibHour);

  if (!run) {
    await catatLog({
      periode: now.toISOString(),
      tipe: "SKIP",
      penerima: ADMIN_EMAIL,
      status: `skip jam ${wibHour} WIB`,
    });
    return { skipped: true, wibHour };
  }

  const semua = (await bacaTransaksi()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  let csvRows = semua.filter((t) => t.created_at >= twoHoursAgo).slice(0, 500);

  let rekapHtml = "";
  if (type === "REKAP") {
    const hari = tanggalWib(now);
    const full = semua
      .filter((t) => t.created_at >= new Date(`${hari}T00:00:00+07:00`).toISOString())
      .slice(0, 1000);
    const r = ringkas(full);
    rekapHtml =
      `<h3>Rekap harian 00:00–${wibHour}:00 WIB</h3><ul>` +
      `<li>Pemasukan: ${r.masuk.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</li>` +
      `<li>Pengeluaran: ${r.keluar.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</li>` +
      `<li>Saldo hari: ${r.saldo.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</li></ul>`;
    csvRows = full;
  }

  const subject = `[${type} ${String(wibHour).padStart(2, "0")}:00 WIB] Laporan keuangan`;
  const html = `<h2>${subject}</h2><p>Delta 2 jam: ${csvRows.length} baris (rekap pakai full hari).</p>${rekapHtml}`;
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: "Laporan Keuangan <onboarding@resend.dev>",
    to: ADMIN_EMAIL,
    subject,
    html,
    attachments: [
      {
        filename: `laporan-${type.toLowerCase()}-${wibHour}.csv`,
        content: Buffer.from(toCsv(csvRows)).toString("base64"),
      },
    ],
  });

  const r = ringkas(csvRows);
  const obsidian = await pushLaporanKeObsidian({
    tipe: type,
    wibHour,
    tanggal: tanggalWib(now),
    rows: csvRows,
    ringkas: { masuk: r.masuk, keluar: r.keluar },
  });

  await catatLog({
    periode: now.toISOString(),
    tipe: type,
    penerima: ADMIN_EMAIL,
    status: error ? `gagal: ${error.message}` : `terkirim jam ${wibHour} WIB | ${obsidian}`,
  });

  if (error) return { error: error.message, wibHour };
  return { ok: true, type, wibHour, rows: csvRows.length, obsidian };
}
