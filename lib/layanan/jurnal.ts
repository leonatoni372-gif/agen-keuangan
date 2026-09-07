// layanan/jurnal — agen kedua di atas kerangka lib/agen.
// Tiap 22:05 WIB: baca daily note hari ini → hitung task selesai/sisa →
// tulis 05-Jurnal/ringkasan-*.md + email ringkas. Mekanis (tanpa LLM).

import {
  VAULT_REPO,
  bacaCatatan,
  pushKeGithub,
  tanggalWib,
  ADMIN_EMAIL,
  getResend,
  catatLog,
} from "@/lib/agen";

export type HasilJurnal =
  | { ok: true; tanggal: string; selesai: number; sisa: number; laporan: string }
  | { error: string };

function hitungTask(md: string): { selesai: number; sisa: number; daftarSisa: string[] } {
  const baris = md.split("\n");
  const tugas = baris.filter((b) => /^\s*-\s*\[[ xX]\]/.test(b));
  const selesai = tugas.filter((b) => /^\s*-\s*\[[xX]\]/.test(b)).length;
  const daftarSisa = tugas
    .filter((b) => /^\s*-\s*\[ \]/.test(b))
    .map((b) => b.trim().slice(0, 120))
    .slice(0, 20);
  return { selesai, sisa: tugas.length - selesai, daftarSisa };
}

export async function jalankanJurnal(now = new Date()): Promise<HasilJurnal> {
  const tanggal = tanggalWib(now);
  try {
    const { content } = await bacaCatatan(`01-Daily/${tanggal}.md`);
    const { selesai, sisa, daftarSisa } = hitungTask(content);
    const path = `05-Jurnal/ringkasan-${tanggal}.md`;
    const md =
      `---\ntags: [jurnal, ringkasan]\ntanggal: ${tanggal}\nselesai: ${selesai}\nsisa: ${sisa}\n---\n\n` +
      `# 📓 Ringkasan ${tanggal}\n\n- Selesai: **${selesai}** · Sisa: **${sisa}**\n\n` +
      `## Terbuka (max 20)\n${daftarSisa.map((t) => `- ${t}`).join("\n") || "- (tidak ada)"}\n\n` +
      `---\n*Otomatis agen-jurnal · [[01-Daily/${tanggal}]]*\n`;
    await pushKeGithub(path, md, `jurnal: ringkasan ${tanggal}`);
    await getResend().emails.send({
      from: "Agen Jurnal <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `[JURNAL ${tanggal}] selesai ${selesai}, sisa ${sisa}`,
      html: `<h2>Ringkasan ${tanggal}</h2><p>Selesai: ${selesai}, sisa: ${sisa}.</p>`,
    });
    await catatLog({
      periode: now.toISOString(),
      tipe: "JURNAL",
      penerima: ADMIN_EMAIL,
      status: `ringkasan ${tanggal}: ${selesai} selesai, ${sisa} sisa`,
    });
    return { ok: true, tanggal, selesai, sisa, laporan: path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await catatLog({ periode: now.toISOString(), tipe: "JURNAL", penerima: ADMIN_EMAIL, status: `gagal: ${msg}` });
    return { error: msg };
  }
}
