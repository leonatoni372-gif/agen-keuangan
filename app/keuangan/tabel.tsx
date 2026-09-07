"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Transaksi } from "@/lib/domain/transaksi";

export default function TabelTransaksi({ rows }: { rows: Transaksi[] }) {
  const [info, setInfo] = useState("");
  const router = useRouter();

  async function hapus(id: string) {
    if (!window.confirm("Hapus transaksi ini?")) return;
    const r = await fetch("/api/transaksi/hapus", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setInfo(r.ok ? "dihapus ✓" : "gagal hapus");
    if (r.ok) router.refresh();
  }

  if (!rows.length) return <p>Belum ada transaksi.</p>;
  return (
    <div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Tanggal", "Jenis", "Kategori", "Nominal", "Catatan", ""].map((h) => (
              <th key={h} style={{ borderBottom: "2px solid #999", textAlign: "left", padding: 6 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td style={{ padding: 6 }}>{t.tanggal}</td>
              <td style={{ padding: 6 }}>{t.jenis}</td>
              <td style={{ padding: 6 }}>{t.kategori ?? "-"}</td>
              <td style={{ padding: 6, textAlign: "right" }}>{Number(t.nominal).toLocaleString("id-ID")}</td>
              <td style={{ padding: 6 }}>{t.catatan ?? "-"}</td>
              <td style={{ padding: 6 }}>
                <button onClick={() => hapus(t.id)}>hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{info}</p>
    </div>
  );
}
