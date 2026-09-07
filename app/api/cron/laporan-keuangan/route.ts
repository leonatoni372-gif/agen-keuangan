import { NextResponse } from "next/server";
import { ADMIN_EMAIL, getResend } from "@/lib/email";
import { getWibHour, jadwalUntukJam } from "@/lib/waktu";
import { pushLaporanKeObsidian } from "@/lib/obsidian";
import { bacaTransaksi, catatLog, type Transaksi } from "@/lib/toko";

function tanggalWib(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toCsv(rows: Transaksi[]): string {
  const head = "id,jenis,kategori,nominal,tanggal,catatan";
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    head,
    ...rows.map((r) =>
      [r.id, r.jenis, r.kategori, r.nominal, r.tanggal, r.catatan]
        .map(esc)
        .join(",")
    ),
  ].join("\n");
}

export async function GET(req: Request) {
  // 1. Guard cron
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Jadwal WIB: tiap 2 jam dari 00:00, rekap di 06/12/16/20
  const now = new Date();
  const wibHour = getWibHour(now);
  const { run, type } = jadwalUntukJam(wibHour);

  if (!run) {
    await catatLog({ periode: now.toISOString(), tipe: "SKIP", penerima: ADMIN_EMAIL, status: `skip jam ${wibHour} WIB` });
    return NextResponse.json({ skipped: true, wibHour });
  }

  // 3. Sumber: toko JSON GitHub, filter in-memory (rutin = 2 jam terakhir, rekap = hari ini WIB)
  const semua = (await bacaTransaksi()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  let csvRows = semua.filter((t) => t.created_at >= twoHoursAgo).slice(0, 500);

  let rekapHtml = "";
  if (type === "REKAP") {
    const hari = tanggalWib(now);
    const full = semua.filter((t) => t.created_at >= new Date(`${hari}T00:00:00+07:00`).toISOString()).slice(0, 1000);
    const sum = (j: string) => full.filter((t) => t.jenis === j).reduce((a, t) => a + Number(t.nominal), 0);
    const rp = (n: number) => n.toLocaleString("id-ID");
    rekapHtml = `<h3>Rekap harian 00:00–${wibHour}:00 WIB</h3><ul><li>Pemasukan: Rp${rp(sum("pemasukan"))}</li><li>Pengeluaran: Rp${rp(sum("pengeluaran"))}</li><li>Saldo hari: Rp${rp(sum("pemasukan") - sum("pengeluaran"))}</li></ul>`;
    csvRows = full;
  }

  // 4. Kirim email
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

  // 5. Push ke Obsidian (via GitHub; gagal = catat saja, email tetap prioritas)
  const sumJenis = (j: string) =>
    csvRows.filter((t) => t.jenis === j).reduce((a, t) => a + Number(t.nominal), 0);
  const obsidian = await pushLaporanKeObsidian({
    tipe: type,
    wibHour,
    tanggal: tanggalWib(now),
    rows: csvRows,
    ringkas: { masuk: sumJenis("pemasukan"), keluar: sumJenis("pengeluaran") },
  });

  await catatLog({
    periode: now.toISOString(),
    tipe: type,
    penerima: ADMIN_EMAIL,
    status: error ? `gagal: ${error.message}` : `terkirim jam ${wibHour} WIB | ${obsidian}`,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, type, wibHour, rows: csvRows.length, obsidian });
}

export const dynamic = "force-dynamic";
