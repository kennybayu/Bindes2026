"""Pencatatan & verifikasi pembayaran sewa lapak."""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from lib.activity import log_activity
from lib.db import db
from lib.serialize import aware_utcnow, to_aware
from models.payment import Payment, PaymentCreate
from routers.auth import require_session

router = APIRouter(prefix="/payments", tags=["payments"], dependencies=[Depends(require_session)])


def _to_payment(doc: dict) -> Payment:
    return Payment(**to_aware(doc, "created_at", "confirmed_at"))


def _label(doc: dict) -> str:
    return f"{doc.get('nama_lengkap', '-')} ({doc.get('nomor_id', '-')})"


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
