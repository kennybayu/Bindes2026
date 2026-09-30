// Helper format tampilan (IDR, tanggal Indonesia, inisial). Hanya untuk tampilan —
// tanggal bisnis ("hari ini") selalu dihitung server-side.

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** "2025-07-14" -> "14/07/2025" */
export function formatDateID(iso: string): string {
  if (!iso) return "-";
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function formatDateTimeID(iso: string | null): string {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  });
}

export function initials(name: string): string {
  const letters = name
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return letters || "P";
}

export const KATEGORI_LABEL: Record<string, string> = {
  harian: "Harian",
  bulanan: "Bulanan",
  tahunan: "Tahunan",
};

export const METODE_LABEL: Record<string, string> = {
  tunai: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
};

export const STATUS_PENYEWA_LABEL: Record<string, string> = {
  aktif: "Aktif",
  berhenti: "Berhenti",
};
