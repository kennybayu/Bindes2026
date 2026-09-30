// Mirror tangan dari model Pydantic di backend/models/ — jaga sinkron di edit yang sama.

// Mirror MeOutput di backend/routers/auth.py
export interface MeOutput {
  username: string;
}

export type KategoriSewa = "harian" | "bulanan" | "tahunan";
export type StatusPenyewa = "aktif" | "berhenti";
export type MetodeBayar = "tunai" | "qris" | "transfer";
export type StatusBayar = "menunggu" | "lunas" | "ditolak";

export interface Tenant {
  id: string;
  nomor_id: string;
  nama_lengkap: string;
  no_hp: string;
  kategori: KategoriSewa;
  blok: string;
  tarif: number;
  mulai: string;
  selesai: string;
  status: StatusPenyewa;
  catatan: string;
  created_at: string;
}

export interface TenantCreate {
  nomor_id?: string; // kosong -> digenerate otomatis backend
  nama_lengkap: string;
  no_hp?: string;
  kategori: KategoriSewa;
  blok: string;
  tarif: number;
  mulai: string;
  selesai: string;
  status?: StatusPenyewa;
  catatan?: string;
}

export interface TenantUpdate {
  nama_lengkap?: string;
  no_hp?: string;
  kategori?: KategoriSewa;
  blok?: string;
  tarif?: number;
  mulai?: string;
  selesai?: string;
  status?: StatusPenyewa;
  catatan?: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  nomor_id: string;
  nama_lengkap: string;
  periode: string;
  jumlah: number;
  metode: MetodeBayar;
  status: StatusBayar;
  jatuh_tempo: string;
  catatan: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface PaymentCreate {
  tenant_id: string;
  periode: string;
  jumlah: number;
  metode: MetodeBayar;
  jatuh_tempo?: string;
  catatan?: string;
}

export interface RevenuePoint {
  label: string;
  total: number;
}

export interface DashboardStats {
  total_penyewa: number;
  penyewa_aktif: number;
  tagihan_menunggu: number;
  nilai_menunggu: number;
  pemasukan_bulan_ini: number;
  pemasukan_bulan_lalu: number;
  by_kategori: Record<string, number>;
  revenue_6m: RevenuePoint[];
  recent_payments: Payment[];
  generated_at: string;
}
