# SIPLAP — Sistem Informasi Pendataan Lapak & Pembayaran, Desa Adat Jimbaran

## Ringkasan
Aplikasi web admin panel (Bahasa Indonesia) untuk pengelola Pasar Adat Jimbaran:
pendataan penyewaan lapak pasar (kategori **Harian / Bulanan / Tahunan**) + manajemen
verifikasi & konfirmasi pembayaran, dengan QR Code per penyewa (generate + scan kamera).
UI mengikuti style admin panel modern ala digipanel (user request): sidebar gelap slate,
topbar putih dengan jam WITA, konten slate-50, aksen emas amber.

## Stack
- Backend: FastAPI (api_router prefix /api) + Motor/MongoDB (db `app`), Pydantic v2, `APP_TZ=Asia/Makassar` (WITA) di backend/.env
- Frontend: Vite + React 19 + TS strict + Tailwind v4 + shadcn/base-ui, TanStack Query, sonner
- QR: `qrcode` (generate → toDataURL + <img>, unduh PNG) & `html5-qrcode` (scan kamera) — keduanya client-side

## Data model (Mongo)
- `tenants` (Penyewa): `id` (uuid), `nomor_id` **LPK-JMB-### unik** (auto dari counter `counters.lapk_seq`, bisa diisi manual), `nama_lengkap`, `no_hp`, `kategori` (harian|bulanan|tahunan), `blok`, `tarif` (Rp/periode), `mulai`/`selesai` (YYYY-MM-DD), `status` (aktif|berhenti), `catatan`, `created_at`
- `payments` (Pembayaran): `id`, `tenant_id`, denormalisasi `nomor_id`+`nama_lengkap`, `periode` (label bebas), `jumlah`, `metode` (tunai|qris|transfer), `status` (**menunggu → lunas** via confirm; bisa `ditolak` via reject), `jatuh_tempo`, `catatan`, `confirmed_at`, `created_at`
- Indexes di `backend/lib/db.py` INDEXES (id/nomor_id unik, tenant_created, status_created)

## Auth (login pengelola)
- Sesi = cookie **httpOnly `siplap_session`** (TTL 7 hari, koleksi `sessions` + TTL index). Tidak ada token di JSON.
- `POST /auth/login` (username+password dari `ADMIN_USERNAME`/`ADMIN_PASSWORD` di backend/.env, dibanding `secrets.compare_digest`) · `GET /auth/me` · `POST /auth/logout`
- **Semua** router data (`/tenants`, `/payments`, `/dashboard`, `/laporan`) di-gate `Depends(require_session)` → 401 tanpa sesi.
- Frontend: `src/components/RequireAuth.tsx` (gerbang via `/auth/me`, redirect ke `/login`), `src/pages/Login.tsx` (`beginSession()` setelah sukses), tombol logout di topbar AppShell memakai `endSession()`.
- Kredensial: lihat memory/test_credentials.md.

## Endpoints /api
- `GET /tenants` (query: q, kategori, status) · `POST /tenants` (201, auto nomor_id) · `GET/PUT/DELETE /tenants/{id}` (delete = kaskade hapus payments penyewa) · `GET /tenants/by-nomor/{nomor_id}` (dipakai scanner QR)
- `GET /payments` (query: status, tenant_id) · `POST /payments` (status awal menunggu) · `PATCH /payments/{id}/confirm` · `PATCH /payments/{id}/reject` · `DELETE /payments/{id}`
- `GET /dashboard/stats` — total/aktif penyewa, tagihan menunggu + nilai, pemasukan bulan ini vs lalu, by_kategori, revenue_6m (bucket WITA), recent_payments
- `GET /laporan/pembayaran.xlsx` — rekap pembayaran Excel (openpyxl: header desa, 9 kolom, total lunas & menunggu); diunduh dari frontend via anchor same-origin agar cookie sesi terkirim

## Cetak (print)
`@media print` di `src/index.css` hanya menampilkan elemen berkelas **`.print-area`**:
- Kartu ID penyewa ber-QR (`QrCardDialog`, tombol "Cetak Kartu" + "Unduh PNG")
- Kuitansi resmi desa (`ReceiptDialog`, tombol "Kuitansi" muncul hanya untuk pembayaran `lunas`) — nomor KW-xxxxxxxx, jumlah + **terbilang** (`terbilangIDR` di `src/lib/format.ts`), tanda tangan Bendahara Pasar Adat

## Halaman frontend (src/pages)
- `/` Dashboard: 4 kartu statistik, grafik tren pemasukan (recharts), daftar pembayaran terbaru + tombol verifikasi cepat
- `/lapak` Pendataan Lapak: CRUD penyewa (dialog form), filter kategori (pill), pencarian, tombol QR per baris (dialog kartu QR + unduh PNG), hapus dengan konfirmasi
- `/pembayaran` Konfirmasi Pembayaran: tab Menunggu/Lunas/Semua, konfirmasi 1-klik (lunas), tolak, hapus, catat pembayaran baru (dialog, tarif prefill)
- `/scan-qr` Pindai QR: kamera html5-qrcode (tombol Aktifkan Kamera; HTTPS/localhost saja), fallback input manual Nomor ID; hasil = dossier penyewa + tagihan/riwayat + konfirmasi + catat pembayaran
- Shell: `src/components/AppShell.tsx` (sidebar gelap + drawer mobile + topbar jam WITA + badge jumlah menunggu)

## QR payload
JSON `{"nomor_id":"LPK-JMB-001","nama":"I Wayan Sudira"}` — hanya Nama Lengkap & Nomor ID. Scanner mem-parse JSON (fallback: teks mentah sebagai nomor_id) lalu GET `/tenants/by-nomor/...`.

## Seed
`cd /app/backend && python seed.py` — idempotent (reset & insert ulang): 14 penyewa (nama Bali, Blok A Pangan/B Sayur/C Daging & Ikan/D Pakaian & Canang), 46 pembayaran (lunas 6 bulan terakhir untuk grafik, tagihan menunggu untuk alur konfirmasi). Penyewa berhenti: LPK-JMB-011.

## Catatan verifikasi
- Tier-1 lolos: curl smoke 9/9 (stat, list, create auto-ID, update, payment+confirm, 404 by-nomor, 422 kategori invalid, delete, public URL), `yarn typecheck` bersih, alur browser penuh (create→QR→delete→confirm→scan manual) tanpa console error.
- Bug terverifikasi & diperbaiki: QR canvas kosong (node-qrcode `toCanvas` + timing ref dialog) → diganti `toDataURL` + `<img>`.
