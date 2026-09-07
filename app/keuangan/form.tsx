"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormTransaksi() {
  const [jenis, setJenis] = useState("pengeluaran");
  const [nominal, setNominal] = useState("");
  const [kategori, setKategori] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [catatan, setCatatan] = useState("");
  const [info, setInfo] = useState("");
  const router = useRouter();

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setInfo("menyimpan…");
    const r = await fetch("/api/transaksi/tambah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jenis, nominal: Number(nominal), kategori, tanggal, catatan }),
    });
    const j = await r.json();
    setInfo(r.ok ? "tersimpan ✓" : `gagal: ${j.error}`);
    if (r.ok) {
      setNominal("");
      setCatatan("");
      router.refresh();
    }
  }

  const inp = { padding: 6, marginRight: 6, marginBottom: 6 } as const;
  return (
    <form onSubmit={simpan} style={{ margin: "16px 0", padding: 12, border: "1px solid #ccc" }}>
      <h2>Tambah transaksi</h2>
      <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={inp}>
        <option value="pengeluaran">pengeluaran</option>
        <option value="pemasukan">pemasukan</option>
      </select>
      <input placeholder="nominal" inputMode="numeric" value={nominal} onChange={(e) => setNominal(e.target.value)} style={inp} required />
      <input placeholder="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} style={inp} />
      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} style={inp} required />
      <input placeholder="catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} style={inp} />
      <button type="submit">Simpan</button>
      <span style={{ marginLeft: 8 }}>{info}</span>
    </form>
  );
}
