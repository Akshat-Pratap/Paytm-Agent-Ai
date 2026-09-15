"""Customer phone+password auth + single ADMIN login. Real JWT (demo fallback if no secret)."""
import re
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt

from ..database import get_db
from .. import models
from ..config import settings
from ..schemas import CustomerRegisterRequest, CustomerLoginRequest, AdminLoginRequest

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# +91 + 10-digit strict 6-9 start (India)
PHONE_RE = re.compile(r"^(\+91)?[6-9]\d{9}$")

def _norm_phone(raw: str) -> str:
    s = re.sub(r"[\s\-()]", "", (raw or "").strip())
    # allow +91 prefix
    if s.startswith("+91"):
        s = s[3:]
    elif s.startswith("91") and len(s) == 12:
        s = s[2:]
    return s

def _validate_phone(raw: str) -> tuple[bool, str]:
    if not raw or not str(raw).strip():
        return False, "phone required"
    n = _norm_phone(raw)
    if not re.match(r"^[6-9]\d{9}$", n):
        return False, "phone must be 10 digits starting 6-9 (with optional +91)"
    return True, n

def _jwt(payload: dict) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    p = {**payload, "exp": exp}
    return jwt.encode(p, settings.JWT_SECRET, algorithm="HS256")

def _verify_admin_password(plain: str) -> bool:
    # Demo fallback: bcrypt of 123456 if ADMIN_PASSWORD_HASH not set
    h = settings.ADMIN_PASSWORD_HASH
    if h:
        try:
            return pwd.verify(plain, h)
        except Exception:
            return False
    # fallback demo check (also verify bcrypt of 123456 lazily)
    return plain == "123456"

@router.post("/auth/register")
def register(req: CustomerRegisterRequest, db: Session = Depends(get_db)):
    ok, norm = _validate_phone(req.phone)
    if not ok:
        return JSONResponse({"error": norm}, status_code=400)
    if not req.name or len(req.name.strip()) < 2:
        return JSONResponse({"error": "name required (min 2 chars)"}, status_code=400)
    if len(req.password) < 6:
        return JSONResponse({"error": "password min 6 chars"}, status_code=400)
    existing = db.query(models.User).filter_by(phone=norm).first()
    if existing:
        if existing.password_hash:
            return JSONResponse({"error": "phone already registered"}, status_code=409)
        # upgrade demo seed user without password
        existing.name = req.name.strip()
        existing.password_hash = pwd.hash(req.password)
        existing.role = "customer"
        db.commit(); db.refresh(existing)
        token = _jwt({"sub": str(existing.id), "phone": norm, "role": "customer"})
        return {"token": token, "role": "customer", "user": {"id": existing.id, "phone": norm, "name": existing.name}}
    h = pwd.hash(req.password)
    # email nullable for phone customers
    u = models.User(name=req.name.strip(), phone=norm, password_hash=h, role="customer")
    db.add(u); db.commit(); db.refresh(u)
    token = _jwt({"sub": str(u.id), "phone": norm, "role": "customer"})
    return {"token": token, "role": "customer", "user": {"id": u.id, "phone": norm, "name": u.name}}

@router.post("/auth/login")
def login(req: CustomerLoginRequest, db: Session = Depends(get_db)):
    ok, norm = _validate_phone(req.phone)
    if not ok:
        return JSONResponse({"error": norm}, status_code=400)
    u = db.query(models.User).filter_by(phone=norm).first()
    if not u or not u.password_hash:
        return JSONResponse({"error": "invalid phone or password"}, status_code=401)
    try:
        if not pwd.verify(req.password, u.password_hash):
            return JSONResponse({"error": "invalid phone or password"}, status_code=401)
    except Exception:
        return JSONResponse({"error": "invalid phone or password"}, status_code=401)
    token = _jwt({"sub": str(u.id), "phone": norm, "role": "customer", "name": u.name})
    return {"token": token, "role": "customer", "user": {"id": u.id, "phone": norm, "name": u.name}}

@router.post("/admin/login")
def admin_login(req: AdminLoginRequest, db: Session = Depends(get_db)):
    user = (req.username or "").strip()
    # single ADMIN role, case-insensitive
    if user.upper() != settings.ADMIN_USERNAME.upper():
        return JSONResponse({"error": "invalid credentials"}, status_code=401)
    if not _verify_admin_password(req.password):
        return JSONResponse({"error": "invalid credentials"}, status_code=401)
    token = _jwt({"sub": "admin", "role": "admin", "username": settings.ADMIN_USERNAME})
    return {"token": token, "role": "admin"}

@router.get("/auth/me")
def me(db: Session = Depends(get_db), auth: str = ""):
    # lightweight; prefer Authorization header
    from fastapi import Header
    return {"ok": True}
