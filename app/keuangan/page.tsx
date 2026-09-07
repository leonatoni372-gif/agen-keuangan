import { createClient } from "@/lib/supabase/server";

export default async function KeuanganPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transaksi")
    .select("id,jenis,kategori,nominal,tanggal,catatan")
    .order("tanggal", { ascending: false })
    .limit(20);

  return (
    <main style={{ padding: 32, maxWidth: 800 }}>
      <h1>Keuangan — 20 transaksi terakhir</h1>
      <pre>{JSON.stringify(data ?? [], null, 2)}</pre>
    </main>
  );
}
