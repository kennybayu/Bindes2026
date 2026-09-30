"""Login pengelola & sesi httpOnly cookie — semua route auth di /api/auth/*.

Tidak ada token di JSON: cookie httpOnly `siplap_session` satu-satunya bukti sesi.
Kredensial dibaca dari backend/.env (ADMIN_USERNAME / ADMIN_PASSWORD).
"""

import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from pydantic import BaseModel

from lib.db import db

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "siplap_session"
SESSION_TTL_SECONDS = 7 * 24 * 3600  # 7 hari


class LoginInput(BaseModel):
    username: str
    password: str


class MeOutput(BaseModel):
    username: str


def _secure(request: Request) -> bool:
    return request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"


async def require_session(session_token: str | None = Cookie(None, alias=COOKIE_NAME)) -> str:
    """Dependency proteksi: token cookie harus terdaftar di koleksi `sessions`."""
    if not session_token:
        raise HTTPException(status_code=401, detail="Sesi berakhir — silakan login kembali")
    session = await db.sessions.find_one({"token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Sesi tidak valid — silakan login kembali")
    return session_token


@router.post("/login", response_model=MeOutput)
async def login(input: LoginInput, request: Request, response: Response):
    admin_user = os.environ.get("ADMIN_USERNAME", "pengelola")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "")
    user_ok = secrets.compare_digest(input.username.strip(), admin_user)
    pass_ok = bool(admin_pass) and secrets.compare_digest(input.password, admin_pass)
    if not (user_ok and pass_ok):
        raise HTTPException(status_code=401, detail="Username atau password salah")

    token = secrets.token_hex(32)
    await db.sessions.insert_one({
        "token": token,
        "username": admin_user,
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=_secure(request),
        path="/",
    )
    return MeOutput(username=admin_user)


@router.get("/me", response_model=MeOutput)
async def me(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Belum login")
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Sesi tidak valid — silakan login kembali")
    return MeOutput(username=session["username"])


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}
