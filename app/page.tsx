export default function Home() {
  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <h1>Agen Keuangan</h1>
      <p>Laporan otomatis tiap 2 jam ke leonatoni372@gmail.com</p>
      <ul>
        <li>
          <a href="/keuangan">Dashboard keuangan</a>
        </li>
        <li>
          <a href="/api/cron/laporan-keuangan">Tes cron (butuh CRON_SECRET)</a>
        </li>
      </ul>
    </main>
  );
}
