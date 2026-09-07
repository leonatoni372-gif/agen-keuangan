import { bacaTransaksi, bacaLog } from "@/lib/infra/toko";
import { obsidianUrl, VAULT_NAME } from "@/lib/infra/obsidian";
import { ringkas, deretHarian, rp } from "@/lib/domain/laporan";
import { tanggalWib } from "@/lib/domain/waktu";
import FormTransaksi from "./form";
import TabelTransaksi from "./tabel";
import Grafik from "./grafik";

export default async function KeuanganPage() {
  const semua = await bacaTransaksi().catch(() => []);
  const log = await bacaLog(5).catch(() => []);
  const hariIni = tanggalWib(new Date());
  const rHari = ringkas(semua.filter((t) => t.tanggal === hariIni));
  const tujuh = new Date(hariIni + "T00:00:00Z");
  tujuh.setUTCDate(tujuh.getUTCDate() - 6);
  const batas = tujuh.toISOString().slice(0, 10);
  const rPekan = ringkas(semua.filter((t) => t.tanggal >= batas));

  const kartu = (label: string, r: { masuk: number; keluar: number; saldo: number }) => (
    <div style={{ border: "1px solid #ccc", padding: 12, flex: 1, minWidth: 180 }}>
      <b>{label}</b>
      <div>Masuk: {rp(r.masuk)}</div>
      <div>Keluar: {rp(r.keluar)}</div>
      <div>Saldo: <b>{rp(r.saldo)}</b></div>
    </div>
  );

  return (
    <main style={{ padding: 32, maxWidth: 860, fontFamily: "system-ui" }}>
      <h1>Keuangan</h1>
      <p>
        Vault: <b>{VAULT_NAME}</b> ·{" "}
        <a href={obsidianUrl("04-Keuangan/Keuangan")}>Buka di Obsidian</a> ·{" "}
        <a href="https://github.com/leonatoni372-gif/alter-brain/tree/main/04-Keuangan">GitHub</a> ·{" "}
        <a href="/api/obsidian/baca?path=Home.md">Home.md (API)</a>
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {kartu(`Hari ini (${hariIni})`, rHari)}
        {kartu("7 hari terakhir", rPekan)}
      </div>
      <h2>14 hari terakhir</h2>
      <Grafik deret={deretHarian(semua, 14, hariIni)} />
      <FormTransaksi />
      <h2>Transaksi terakhir</h2>
      <TabelTransaksi rows={[...semua].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 20)} />
      <h2>Laporan terakhir</h2>
      <pre>{JSON.stringify(log, null, 2)}</pre>
    </main>
  );
}
