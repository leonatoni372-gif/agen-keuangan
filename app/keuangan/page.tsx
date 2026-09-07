import { bacaTransaksi, bacaLog } from "@/lib/toko";
import { obsidianUrl, VAULT_NAME } from "@/lib/obsidian";
import FormTransaksi from "./form";

export default async function KeuanganPage() {
  const transaksi = (await bacaTransaksi().catch(() => [])).slice(0, 20);
  const log = await bacaLog(5).catch(() => []);

  return (
    <main style={{ padding: 32, maxWidth: 800, fontFamily: "system-ui" }}>
      <h1>Keuangan — 20 transaksi terakhir</h1>
      <p>
        Vault: <b>{VAULT_NAME}</b> ·{" "}
        <a href={obsidianUrl("04-Keuangan/Keuangan")}>Buka Keuangan di Obsidian</a> ·{" "}
        <a href="https://github.com/leonatoni372-gif/alter-brain/tree/main/04-Keuangan">
          Folder Keuangan di GitHub
        </a> ·{" "}
        <a href="/api/obsidian/baca?path=Home.md">Baca Home.md (API)</a>
      </p>
      <FormTransaksi />
      <h2>Laporan terakhir (termasuk status Obsidian)</h2>
      <pre>{JSON.stringify(log, null, 2)}</pre>
      <h2>Transaksi</h2>
      <pre>{JSON.stringify(transaksi, null, 2)}</pre>
    </main>
  );
}
