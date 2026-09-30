"""Model pembayaran sewa lapak."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

MetodeBayar = Literal["tunai", "qris", "transfer"]
StatusBayar = Literal["menunggu", "lunas", "ditolak"]


class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    nomor_id: str  # denormalisasi agar tabel tetap cepat dirender
    nama_lengkap: str
    periode: str  # label bebas, mis. "Desember 2025" / "Retribusi 12/07"
    jumlah: int
    metode: MetodeBayar = "tunai"
    status: StatusBayar = "menunggu"
    jatuh_tempo: str = ""  # YYYY-MM-DD, opsional
    catatan: str = ""
    confirmed_at: datetime | None = None
    created_at: datetime


class PaymentCreate(BaseModel):
    tenant_id: str
    periode: str
    jumlah: int
    metode: MetodeBayar = "tunai"
    jatuh_tempo: str = ""
    catatan: str = ""
