import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, getResend } from "@/lib/email";
import { getWibHour, jadwalUntukJam } from "@/lib/waktu";
import { pushLaporanKeObsidian } from "@/lib/obsidian";

function tanggalWib(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type Transaksi = {
  id: string;
  jenis: string;
  kategori: string | null;
  nominal: number;
  tanggal: string;
  catatan: string | null;
};

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
  const supabase = createAdminClient();

  if (!run) {
    await supabase.from("laporan_log").insert({
      periode: now.toISOString(),
      tipe: "SKIP",
      penerima: ADMIN_EMAIL,
      status: `skip jam ${wibHour} WIB`,
    });
    return NextResponse.json({ skipped: true, wibHour });
  }

  // 3. Query: rutin = 2 jam terakhir, rekap = hari ini 00:00 WIB s/d now
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const { data: delta } = await supabase
    .from("transaksi")
    .select("id,jenis,kategori,nominal,tanggal,catatan")
    .gte("created_at", twoHoursAgo)
    .order("created_at", { ascending: false })
    .limit(500);

  let rekapHtml = "";
  let csvRows: Transaksi[] = (delta as Transaksi[]) ?? [];

  if (type === "REKAP") {
    // awal hari WIB dalam UTC
    const wibNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const startWib = new Date(wibNow);
    startWib.setHours(0, 0, 0, 0);
    const offsetMs = 7 * 3600 * 1000; // WIB = UTC+7
    const startUtc = new Date(startWib.getTime() - offsetMs).toISOString();

    const { data: today } = await supabase
      .from("transaksi")
      .select("jenis,nominal")
      .gte("created_at", startUtc);
    const sum = (j: string) =>
      (today ?? []).filter((t) => t.jenis === j).reduce((a, t) => a + Number(t.nominal), 0);
    rekapHtml = `<h3>Rekap harian 00:00–${wibHour}:00 WIB</h3><ul><li>Pemasukan: Rp${sum(
      "pemasukan"
    ).toLocaleString("id-ID")}</li><li>Pengeluaran: Rp${sum(
      "pengeluaran"
    ).toLocaleString("id-ID")}</li><li>Saldo hari: Rp${(
      sum("pemasukan") - sum("pengeluaran")
    ).toLocaleString("id-ID")}</li></ul>`;

    const { data: full } = await supabase
      .from("transaksi")
      .select("id,jenis,kategori,nominal,tanggal,catatan")
      .gte("created_at", startUtc)
      .order("created_at", { ascending: false })
      .limit(1000);
    csvRows = (full as Transaksi[]) ?? [];
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

  await supabase.from("laporan_log").insert({
    periode: now.toISOString(),
    tipe: type,
    penerima: ADMIN_EMAIL,
    status: error ? `gagal: ${error.message}` : `terkirim jam ${wibHour} WIB | ${obsidian}`,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, type, wibHour, rows: csvRows.length, obsidian });
}

// ponytail: single hourly cron + filter WIB, split ke 12 cron saat Vercel limit berubah
export const dynamic = "force-dynamic";
