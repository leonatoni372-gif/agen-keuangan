// domain/waktu — WIB helpers. Vercel cron jalan UTC, filter di code pakai Asia/Jakarta.

export function getWibHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    hour12: false,
  }).format(date);
  return Number(parts) % 24;
}

export function tanggalWib(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const REKAP_HOURS = [6, 12, 16, 20];

export function jadwalUntukJam(wibHour: number): {
  run: boolean;
  type: "RUTIN" | "REKAP";
} {
  if (wibHour % 2 !== 0) return { run: false, type: "RUTIN" };
  return {
    run: true,
    type: REKAP_HOURS.includes(wibHour) ? "REKAP" : "RUTIN",
  };
}
