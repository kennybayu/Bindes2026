"""Pencatatan & verifikasi pembayaran sewa lapak."""

from datetime import date
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from lib.activity import log_activity
from lib.db import db
from lib.dates import today_iso
from lib.serialize import aware_utcnow, to_aware
from models.payment import (
    BulkBillResult,
    OverduePayment,
    OverdueSummary,
    Payment,
    PaymentCreate,
)
from routers.auth import require_session

router = APIRouter(prefix="/payments", tags=["payments"], dependencies=[Depends(require_session)])


def _to_payment(doc: dict) -> Payment:
    return Payment(**to_aware(doc, "created_at", "confirmed_at"))


def _label(doc: dict) -> str:
    return f"{doc.get('nama_lengkap', '-')} ({doc.get('nomor_id', '-')})"


BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
            "Agustus", "September", "Oktober", "November", "Desember"]


def _days_between(iso_awal: str, iso_akhir: str) -> int:
    """Selisih hari antara dua tanggal ISO (YYYY-MM-DD)."""
    awal = date.fromisoformat(iso_awal)
    akhir = date.fromisoformat(iso_akhir)
    return (akhir - awal).days


# Rute statis didefinisikan sebelum rute ber-parameter agar tidak tertangkap /{id}.
@router.get("/overdue", response_model=OverdueSummary)
async def list_overdue():
    """Rekap tunggakan: tagihan `menunggu` yang jatuh temponya sudah lewat hari ini (WITA)."""
    hari_ini = today_iso()
    docs = await db.payments.find({"status": "menunggu"}).to_list(2000)

    items: list[OverduePayment] = []
    for d in docs:
        jatuh_tempo = (d.get("jatuh_tempo") or "").strip()
        if not jatuh_tempo or jatuh_tempo >= hari_ini:
            continue  # belum jatuh tempo / tanpa tanggal tempo
        tenant = await db.tenants.find_one({"id": d.get("tenant_id")}) or {}
        payment = Payment(**to_aware(d, "created_at", "confirmed_at"))
        items.append(
            OverduePayment(
                **payment.model_dump(),
                hari_telat=_days_between(jatuh_tempo, hari_ini),
                kategori=tenant.get("kategori", ""),
                blok=tenant.get("blok", ""),
                no_hp=tenant.get("no_hp", ""),
            )
        )

    items.sort(key=lambda x: x.hari_telat, reverse=True)
    return OverdueSummary(
        periode_hari_ini=hari_ini,
        jumlah_penyewa=len({i.tenant_id for i in items}),
        total_tunggakan=sum(i.jumlah for i in items),
        telat_terlama=items[0].hari_telat if items else 0,
        items=items,
    )


@router.post("/bulk-monthly", response_model=BulkBillResult)
async def bulk_monthly_bills(actor: str = Depends(require_session)):
    """Terbitkan tagihan bulan berjalan untuk semua penyewa BULANAN yang aktif.
    Idempotent: penyewa yang sudah punya tagihan periode ini dilewati."""
    hari_ini = today_iso()
    tahun, bulan = int(hari_ini[:4]), int(hari_ini[5:7])
    periode = f"{BULAN_ID[bulan - 1]} {tahun}"
    # Jatuh tempo: tanggal 10 bulan berjalan
    jatuh_tempo = f"{tahun:04d}-{bulan:02d}-10"

    dibuat = 0
    dilewati = 0
    total = 0
    baru: list[dict] = []
    async for tenant in db.tenants.find({"kategori": "bulanan", "status": "aktif"}):
        sudah_ada = await db.payments.find_one({"tenant_id": tenant["id"], "periode": periode})
        if sudah_ada:
            dilewati += 1
            continue
        payment = Payment(
            tenant_id=tenant["id"],
            nomor_id=tenant["nomor_id"],
            nama_lengkap=tenant["nama_lengkap"],
            periode=periode,
            jumlah=int(tenant.get("tarif", 0)),
            metode="tunai",
            status="menunggu",
            jatuh_tempo=jatuh_tempo,
            catatan="Tagihan massal bulanan",
            created_at=aware_utcnow(),
        )
        baru.append(payment.model_dump())
        dibuat += 1
        total += payment.jumlah

    if baru:
        await db.payments.insert_many(baru)
        await log_activity(
            actor, "buat", "pembayaran", "bulk",
            f"Tagihan massal {periode}",
            f"{dibuat} tagihan diterbitkan, {dilewati} dilewati",
        )

    return BulkBillResult(periode=periode, dibuat=dibuat, dilewati=dilewati, total_nilai=total)


@router.get("", response_model=List[Payment])
async def list_payments(
    status: str | None = Query(None),
    tenant_id: str | None = Query(None),
):
    query: dict[str, Any] = {}
    if status:
        query["status"] = status
    if tenant_id:
        query["tenant_id"] = tenant_id
    docs = await db.payments.find(query).sort("created_at", -1).to_list(1000)
    return [_to_payment(d) for d in docs]


@router.post("", response_model=Payment, status_code=201)
async def create_payment(input: PaymentCreate, actor: str = Depends(require_session)):
    tenant = await db.tenants.find_one({"id": input.tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Penyewa tidak ditemukan")
    payment = Payment(
        tenant_id=input.tenant_id,
        nomor_id=tenant["nomor_id"],
        nama_lengkap=tenant["nama_lengkap"],
        periode=input.periode,
        jumlah=input.jumlah,
        metode=input.metode,
        status="menunggu",
        jatuh_tempo=input.jatuh_tempo,
        catatan=input.catatan,
        created_at=aware_utcnow(),
    )
    await db.payments.insert_one(payment.model_dump())
    await log_activity(
        actor, "buat", "pembayaran", payment.id,
        f"{payment.nama_lengkap} ({payment.nomor_id})",
        f"{payment.periode} — Rp {payment.jumlah:,}".replace(",", "."),
    )
    return payment


@router.patch("/{id}/confirm", response_model=Payment)
async def confirm_payment(id: str, actor: str = Depends(require_session)):
    doc = await db.payments.find_one_and_update(
        {"id": id},
        {"$set": {"status": "lunas", "confirmed_at": aware_utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    await log_activity(
        actor, "konfirmasi", "pembayaran", id, _label(doc),
        f"{doc.get('periode', '')} — Rp {int(doc.get('jumlah', 0)):,}".replace(",", "."),
    )
    return _to_payment(doc)


@router.patch("/{id}/reject", response_model=Payment)
async def reject_payment(id: str, actor: str = Depends(require_session)):
    doc = await db.payments.find_one_and_update(
        {"id": id},
        {"$set": {"status": "ditolak"}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    await log_activity(actor, "tolak", "pembayaran", id, _label(doc), doc.get("periode", ""))
    return _to_payment(doc)


@router.delete("/{id}")
async def delete_payment(id: str, actor: str = Depends(require_session)):
    doc = await db.payments.find_one({"id": id})
    result = await db.payments.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    if doc:
        await log_activity(actor, "hapus", "pembayaran", id, _label(doc), doc.get("periode", ""))
    return {"deleted": True}
