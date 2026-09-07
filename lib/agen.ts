// lib/agen — kerangka mini semua agen vault.
// Pola: daftar sumber .md → olah (di layanan/*) → tulis laporan → tempel daily.
// Aturan: idempoten (penanda unik), tak pernah throw ke penjadwal (kembalikan string status).

export { VAULT_REPO, APP_REPO, githubGet, pushKeGithub, ubahGithub, daftarMd } from "./infra/github";
export { sanitasiPath, bacaCatatan, templateDaily, tempelDaily, VAULT_NAME, obsidianUrl } from "./infra/obsidian";
export { catatLog } from "./infra/toko";
export { tanggalWib } from "./domain/waktu";
export { ADMIN_EMAIL, getResend } from "./infra/email";
