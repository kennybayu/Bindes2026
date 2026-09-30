// Tautan pengingat WhatsApp — wa.me tanpa integrasi/API key, cukup tautan pra-isi.
import type { Payment, Tenant } from "@/lib/types";
import { formatDateID, formatRupiah } from "@/lib/format";

/** 0812-3456-7801 -> 62812345678 01 -> 628123456780 1 (E.164 tanpa '+'). */
export function normalizePhoneID(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function reminderText(tenant: Tenant, payment?: Payment | null): string {
  const sapaan = `Om Swastiastu, Bapak/Ibu ${tenant.nama_lengkap}.`;
  const identitas = `Kami dari pengelola Pasar Adat Desa Adat Jimbaran. Data lapak Bapak/Ibu: ${tenant.blok} (Nomor ID ${tenant.nomor_id}).`;
  const tagihan = payment
    ? `Mohon informasi pembayaran sewa untuk ${payment.periode} sebesar ${formatRupiah(payment.jumlah)}${
        payment.jatuh_tempo ? ` yang jatuh tempo pada ${formatDateID(payment.jatuh_tempo)}` : ""
      }, saat ini masih menunggu konfirmasi.`
    : `Mohon informasi pembayaran sewa lapak sebesar ${formatRupiah(tenant.tarif)} untuk periode berjalan (masa sewa s.d. ${formatDateID(tenant.selesai)}).`;
  const penutup =
    "Pembayaran dapat dilakukan tunai kepada juru pungut pasar, QRIS Desa Adat, atau transfer LPD Jimbaran. Terima kasih atas kerja samanya. Suksma 🙏";
  return [sapaan, identitas, tagihan, penutup].join("\n\n");
}

/** Buka WhatsApp dengan pesan pengingat; `null` bila nomor HP belum terisi. */
export function waReminderLink(tenant: Tenant, payment?: Payment | null): string | null {
  const phone = normalizePhoneID(tenant.no_hp);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(reminderText(tenant, payment))}`;
}
