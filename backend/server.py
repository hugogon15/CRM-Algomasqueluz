from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import json
import base64
import asyncio
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import resend
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from bson import ObjectId

# ---- env / db ----
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

JWT_ALG = "HS256"
ACCESS_MIN = 60 * 24  # 1 day for dev convenience
REFRESH_DAYS = 7

ROLES = ["admin", "comercial", "gestor", "backoffice"]
CRM_STATES = [
    "nuevo_lead",
    "pendiente_estudio",
    "enviado",
    "renovacion",
    "cliente_activo",
    "sin_ahorro",
]
PROVINCIAS = [
    "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga",
    "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba",
    "Valladolid", "Vigo", "Gijón", "Granada", "A Coruña", "Vitoria",
    "Elche", "Oviedo", "Pamplona", "Cartagena", "Almería", "Santander",
]
COMERCIALIZADORAS = [
    "Endesa", "Iberdrola", "Naturgy", "Repsol", "TotalEnergies",
    "EDP", "Holaluz", "Audax", "Acciona Energía", "Octopus Energy",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("aml")

# ---- helpers ----

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=REFRESH_DAYS * 86400, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

def sanitize_user(u: dict) -> dict:
    return {
        "id": str(u.get("_id") or u.get("id")),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "comercial"),
        "phone": u.get("phone", ""),
        "avatar_url": u.get("avatar_url", ""),
        "created_at": u.get("created_at"),
    }

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---- auth dependency ----

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no existe")
        return sanitize_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return user
    return dep

# ---- models ----

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: str = "comercial"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None

class ClientIn(BaseModel):
    nombre: str
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    cups: Optional[str] = ""
    provincia: Optional[str] = ""
    direccion: Optional[str] = ""
    nif: Optional[str] = ""
    estado: str = "nuevo_lead"
    comercial_id: Optional[str] = None
    tiene_ahorro: bool = False
    ahorro_estimado: float = 0.0
    notas: Optional[str] = ""

class ClientUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    cups: Optional[str] = None
    provincia: Optional[str] = None
    direccion: Optional[str] = None
    nif: Optional[str] = None
    estado: Optional[str] = None
    comercial_id: Optional[str] = None
    tiene_ahorro: Optional[bool] = None
    ahorro_estimado: Optional[float] = None
    notas: Optional[str] = None

class ContractIn(BaseModel):
    cliente_id: str
    comercializadora: str
    tarifa: str = ""
    potencia_contratada: float = 0.0
    fecha_inicio: str  # ISO date
    fecha_renovacion: str  # ISO date
    permanencia_meses: int = 12
    importe_anual: float = 0.0
    notas: Optional[str] = ""

class ContractUpdate(BaseModel):
    comercializadora: Optional[str] = None
    tarifa: Optional[str] = None
    potencia_contratada: Optional[float] = None
    fecha_inicio: Optional[str] = None
    fecha_renovacion: Optional[str] = None
    permanencia_meses: Optional[int] = None
    importe_anual: Optional[float] = None
    notas: Optional[str] = None

# ---- app ----

app = FastAPI(title="AlgoMásQueLuz OS")
api = APIRouter(prefix="/api")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.clients.create_index("cups")
    await db.clients.create_index("nombre")
    await db.contracts.create_index("cliente_id")
    await db.contracts.create_index("fecha_renovacion")
    await db.documents.create_index("cliente_id")
    await db.notifications.create_index("user_id")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")

    await seed_admin()
    await seed_demo_data()

    creds = (
        "# AlgoMásQueLuz - Test Credentials\n\n"
        f"## Admin\n- Email: `{os.environ.get('ADMIN_EMAIL')}`\n- Password: `{os.environ.get('ADMIN_PASSWORD')}`\n- Role: admin\n\n"
        "## Demo Users (password: `Demo123!` for all)\n"
        "- `carlos.comercial@algomasqueluz.com` (comercial)\n"
        "- `lucia.gestor@algomasqueluz.com` (gestor)\n"
        "- `marta.back@algomasqueluz.com` (backoffice)\n\n"
        "## Auth endpoints\n"
        "- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n- POST /api/auth/register\n"
    )
    mem = Path("/app/memory")
    mem.mkdir(parents=True, exist_ok=True)
    (mem / "test_credentials.md").write_text(creds)

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@algomasqueluz.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin AlgoMásQueLuz",
            "role": "admin",
            "phone": "",
            "avatar_url": "",
            "created_at": now_iso(),
        })
        log.info("Admin seeded")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        log.info("Admin password updated from env")

async def seed_demo_data():
    if await db.users.count_documents({}) > 1:
        return  # already seeded

    demo_users = [
        {"email": "carlos.comercial@algomasqueluz.com", "name": "Carlos Pérez", "role": "comercial",
         "avatar_url": "https://images.unsplash.com/photo-1713947507130-227586ab3024?crop=entropy&cs=srgb&fm=jpg&w=200&h=200&fit=crop"},
        {"email": "lucia.gestor@algomasqueluz.com", "name": "Lucía Martín", "role": "gestor",
         "avatar_url": "https://images.unsplash.com/photo-1576533247967-79124db83e48?crop=entropy&cs=srgb&fm=jpg&w=200&h=200&fit=crop"},
        {"email": "marta.back@algomasqueluz.com", "name": "Marta Ruiz", "role": "backoffice", "avatar_url": ""},
    ]
    user_ids = {}
    for u in demo_users:
        doc = {**u, "password_hash": hash_password("Demo123!"), "phone": "", "created_at": now_iso()}
        res = await db.users.insert_one(doc)
        user_ids[u["email"]] = str(res.inserted_id)

    carlos = user_ids["carlos.comercial@algomasqueluz.com"]
    lucia = user_ids["lucia.gestor@algomasqueluz.com"]

    sample_clients = [
        ("Panadería La Esquina", "+34 612 345 678", "info@panaderialaesquina.es", "ES0021000000123456AB", "Madrid", "cliente_activo", carlos, True, 1240.50),
        ("Restaurante El Mirador", "+34 615 222 111", "reservas@elmirador.com", "ES0031000000654321CD", "Barcelona", "renovacion", carlos, True, 3200.00),
        ("Taller Mecánico GarcíaHnos", "+34 617 998 776", "garciahnos@gmail.com", "ES0029000000987654EF", "Valencia", "pendiente_estudio", lucia, False, 0),
        ("Clínica Dental SonríeMás", "+34 644 333 222", "info@sonriemas.es", "ES0044000000112233GH", "Sevilla", "enviado", carlos, True, 2150.75),
        ("Hotel Vista Mar", "+34 671 444 555", "direccion@vistamar.com", "ES0055000000556677IJ", "Málaga", "nuevo_lead", carlos, False, 0),
        ("Despacho Abogados Ruiz", "+34 691 121 314", "contacto@ruizabogados.es", "ES0022000000778899KL", "Madrid", "cliente_activo", lucia, True, 890.20),
        ("Supermercados Frescolín", "+34 633 565 778", "compras@frescolin.es", "ES0066000000334455MN", "Bilbao", "renovacion", carlos, True, 5640.00),
        ("Academia Idiomas Polyglot", "+34 686 909 121", "info@polyglot.es", "ES0077000000667788OP", "Zaragoza", "sin_ahorro", lucia, False, 0),
        ("Gimnasio FitZone", "+34 612 343 545", "hola@fitzone.es", "ES0088000000889900QR", "Murcia", "pendiente_estudio", carlos, False, 0),
        ("Floristería Las Camelias", "+34 644 767 898", "pedidos@lascamelias.es", "ES0099000000990011ST", "Alicante", "cliente_activo", carlos, True, 420.30),
        ("Imprenta Rápida Gutenberg", "+34 655 121 232", "info@gutenberg.es", "ES0011000000223344UV", "Valladolid", "enviado", lucia, True, 1875.00),
        ("Cafetería Aroma", "+34 666 343 454", "aroma@cafe.es", "ES0033000000445566WX", "Granada", "nuevo_lead", carlos, False, 0),
    ]

    today = datetime.now(timezone.utc)
    for idx, (nombre, tel, email, cups, prov, estado, com_id, ahorro, valor) in enumerate(sample_clients):
        cdoc = {
            "nombre": nombre, "telefono": tel, "email": email, "cups": cups,
            "provincia": prov, "direccion": f"Calle Mayor {idx+1}", "nif": "",
            "estado": estado, "comercial_id": com_id, "tiene_ahorro": ahorro,
            "ahorro_estimado": valor, "notas": "",
            "ultimo_contacto": (today - timedelta(days=idx * 3)).isoformat(),
            "created_at": (today - timedelta(days=30 + idx)).isoformat(),
        }
        res = await db.clients.insert_one(cdoc)
        cliente_id = str(res.inserted_id)

        # Contract for active/renewal clients
        if estado in ("cliente_activo", "renovacion", "enviado"):
            renovacion_offset_days = [9, 25, 65, 120, 200, 320][idx % 6]
            contract = {
                "cliente_id": cliente_id,
                "comercializadora": COMERCIALIZADORAS[idx % len(COMERCIALIZADORAS)],
                "tarifa": ["2.0TD", "3.0TD", "6.1TD"][idx % 3],
                "potencia_contratada": round(5.5 + idx * 1.3, 2),
                "fecha_inicio": (today - timedelta(days=300 + idx * 5)).date().isoformat(),
                "fecha_renovacion": (today + timedelta(days=renovacion_offset_days)).date().isoformat(),
                "permanencia_meses": 12,
                "importe_anual": round(1500 + idx * 280.5, 2),
                "notas": "",
                "created_at": now_iso(),
            }
            await db.contracts.insert_one(contract)

    log.info("Demo data seeded")

# ============ AUTH ============

@api.post("/auth/login")
async def login(body: LoginIn, response: Response, request: Request):
    email = body.email.lower().strip()
    # Use email-only as identifier; in production behind K8s ingress, request.client.host
    # rotates between proxy pods so per-IP keys never accumulate. Email-only is safer here.
    ident = f"email:{email}"

    # brute force
    att = await db.login_attempts.find_one({"identifier": ident})
    if att and att.get("count", 0) >= 5 and att.get("locked_until"):
        if datetime.fromisoformat(att["locked_until"]) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Demasiados intentos. Vuelve a probar en 15 minutos.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        new_count = (att.get("count", 0) if att else 0) + 1
        update = {"count": new_count, "identifier": ident, "last_attempt": now_iso()}
        if new_count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    access = create_access_token(uid, user["email"], user.get("role", "comercial"))
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"user": sanitize_user(user)}

@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no existe")
        access = create_access_token(str(user["_id"]), user["email"], user.get("role", "comercial"))
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_MIN * 60, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

@api.post("/auth/register")
async def register(body: RegisterIn, response: Response, user: dict = Depends(require_role("admin"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Rol inválido")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email ya registrado")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "phone": "",
        "avatar_url": "",
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return sanitize_user(doc)

# ============ USERS ============

@api.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}).to_list(500)
    return [sanitize_user(u) for u in users]

@api.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user: dict = Depends(require_role("admin"))):
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "password" in update:
        update["password_hash"] = hash_password(update.pop("password"))
    if "role" in update and update["role"] not in ROLES:
        raise HTTPException(status_code=400, detail="Rol inválido")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    return sanitize_user(u)

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="No puedes borrarte a ti mismo")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}

# ============ CLIENTS ============

def serialize_client(c: dict, comerciales_map: Optional[dict] = None) -> dict:
    return {
        "id": str(c["_id"]),
        "nombre": c.get("nombre", ""),
        "telefono": c.get("telefono", ""),
        "email": c.get("email", ""),
        "cups": c.get("cups", ""),
        "provincia": c.get("provincia", ""),
        "direccion": c.get("direccion", ""),
        "nif": c.get("nif", ""),
        "estado": c.get("estado", "nuevo_lead"),
        "comercial_id": c.get("comercial_id"),
        "comercial_name": (comerciales_map or {}).get(c.get("comercial_id", ""), ""),
        "tiene_ahorro": c.get("tiene_ahorro", False),
        "ahorro_estimado": c.get("ahorro_estimado", 0.0),
        "notas": c.get("notas", ""),
        "ultimo_contacto": c.get("ultimo_contacto"),
        "created_at": c.get("created_at"),
    }

async def get_comerciales_map() -> dict:
    users = await db.users.find({}, {"name": 1}).to_list(500)
    return {str(u["_id"]): u.get("name", "") for u in users}

@api.get("/clients")
async def list_clients(
    q: Optional[str] = None,
    estado: Optional[str] = None,
    comercial_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"nombre": rx}, {"cups": rx}, {"email": rx}, {"telefono": rx}]
    if estado:
        query["estado"] = estado
    if comercial_id:
        query["comercial_id"] = comercial_id

    # comercial users only see their own clients
    if user["role"] == "comercial":
        query["comercial_id"] = user["id"]

    clients = await db.clients.find(query).sort("created_at", -1).to_list(500)
    cm = await get_comerciales_map()
    return [serialize_client(c, cm) for c in clients]

@api.post("/clients")
async def create_client(body: ClientIn, user: dict = Depends(get_current_user)):
    if body.estado not in CRM_STATES:
        raise HTTPException(status_code=400, detail="Estado inválido")
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    doc["ultimo_contacto"] = now_iso()
    if not doc.get("comercial_id"):
        doc["comercial_id"] = user["id"]
    res = await db.clients.insert_one(doc)
    c = await db.clients.find_one({"_id": res.inserted_id})
    cm = await get_comerciales_map()
    return serialize_client(c, cm)

@api.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cm = await get_comerciales_map()
    return serialize_client(c, cm)

@api.patch("/clients/{client_id}")
async def update_client(client_id: str, body: ClientUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "estado" in update and update["estado"] not in CRM_STATES:
        raise HTTPException(status_code=400, detail="Estado inválido")
    update["ultimo_contacto"] = now_iso()
    await db.clients.update_one({"_id": ObjectId(client_id)}, {"$set": update})
    c = await db.clients.find_one({"_id": ObjectId(client_id)})
    cm = await get_comerciales_map()
    return serialize_client(c, cm)

@api.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_role("admin", "gestor"))):
    await db.clients.delete_one({"_id": ObjectId(client_id)})
    await db.contracts.delete_many({"cliente_id": client_id})
    await db.documents.delete_many({"cliente_id": client_id})
    return {"ok": True}

# ============ CONTRACTS ============

def serialize_contract(c: dict, client_name: str = "") -> dict:
    return {
        "id": str(c["_id"]),
        "cliente_id": c.get("cliente_id"),
        "cliente_nombre": client_name,
        "comercializadora": c.get("comercializadora", ""),
        "tarifa": c.get("tarifa", ""),
        "potencia_contratada": c.get("potencia_contratada", 0),
        "fecha_inicio": c.get("fecha_inicio"),
        "fecha_renovacion": c.get("fecha_renovacion"),
        "permanencia_meses": c.get("permanencia_meses", 12),
        "importe_anual": c.get("importe_anual", 0),
        "notas": c.get("notas", ""),
        "created_at": c.get("created_at"),
    }

@api.get("/contracts")
async def list_contracts(cliente_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if cliente_id:
        query["cliente_id"] = cliente_id

    # Comerciales can only see contracts of their own clients
    if user["role"] == "comercial":
        own_clients = await db.clients.find({"comercial_id": user["id"]}, {"_id": 1}).to_list(1000)
        own_ids = [str(c["_id"]) for c in own_clients]
        if cliente_id and cliente_id not in own_ids:
            return []
        query["cliente_id"] = {"$in": own_ids} if not cliente_id else cliente_id

    contracts = await db.contracts.find(query).sort("fecha_renovacion", 1).to_list(1000)
    cli_ids = list({c["cliente_id"] for c in contracts if c.get("cliente_id")})
    clients = await db.clients.find({"_id": {"$in": [ObjectId(i) for i in cli_ids]}}).to_list(1000) if cli_ids else []
    cmap = {str(c["_id"]): c.get("nombre", "") for c in clients}
    return [serialize_contract(c, cmap.get(c.get("cliente_id", ""), "")) for c in contracts]

@api.post("/contracts")
async def create_contract(body: ContractIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    res = await db.contracts.insert_one(doc)
    c = await db.contracts.find_one({"_id": res.inserted_id})
    cli = await db.clients.find_one({"_id": ObjectId(c["cliente_id"])})
    return serialize_contract(c, cli.get("nombre", "") if cli else "")

@api.patch("/contracts/{contract_id}")
async def update_contract(contract_id: str, body: ContractUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    await db.contracts.update_one({"_id": ObjectId(contract_id)}, {"$set": update})
    c = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    cli = await db.clients.find_one({"_id": ObjectId(c["cliente_id"])})
    return serialize_contract(c, cli.get("nombre", "") if cli else "")

@api.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, user: dict = Depends(get_current_user)):
    await db.contracts.delete_one({"_id": ObjectId(contract_id)})
    return {"ok": True}

# ============ DOCUMENTS / OCR ============

def serialize_document(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "cliente_id": d.get("cliente_id"),
        "nombre": d.get("nombre", ""),
        "tipo": d.get("tipo", "factura"),
        "mime_type": d.get("mime_type", ""),
        "size": d.get("size", 0),
        "extracted_data": d.get("extracted_data"),
        "ocr_status": d.get("ocr_status", "pending"),
        "created_at": d.get("created_at"),
    }

@api.get("/documents")
async def list_documents(cliente_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if cliente_id:
        query["cliente_id"] = cliente_id
    docs = await db.documents.find(query).sort("created_at", -1).to_list(500)
    return [serialize_document(d) for d in docs]

@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    await db.documents.delete_one({"_id": ObjectId(doc_id)})
    return {"ok": True}

async def run_ocr_gemini(file_path: str, mime_type: str) -> Dict[str, Any]:
    """Use Gemini 3 Pro via emergentintegrations to extract structured data from energy invoice."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    except Exception as e:
        return {"error": f"emergentintegrations no disponible: {e}"}

    if not EMERGENT_LLM_KEY:
        return {"error": "EMERGENT_LLM_KEY no configurada"}

    system = (
        "Eres un asistente experto en análisis de FACTURAS ENERGÉTICAS ESPAÑOLAS (luz/gas). "
        "Extrae los datos estructurados de la factura proporcionada y devuelve ESTRICTAMENTE un JSON válido sin texto adicional. "
        "Si un campo no aparece, usa null. Los importes en euros con punto decimal. Las fechas en formato YYYY-MM-DD."
    )
    prompt = (
        "Analiza esta factura energética y devuelve un JSON con la siguiente estructura exacta:\n"
        "{\n"
        '  "cups": "código CUPS (22 caracteres tipo ES00XX...) o null",\n'
        '  "titular": "nombre del titular",\n'
        '  "nif": "NIF/CIF del titular",\n'
        '  "direccion_suministro": "dirección completa del punto de suministro",\n'
        '  "comercializadora": "nombre de la comercializadora",\n'
        '  "tarifa": "código de tarifa (ej 2.0TD, 3.0TD, 6.1TD)",\n'
        '  "potencia_contratada_kw": número o null,\n'
        '  "periodo_facturacion_inicio": "YYYY-MM-DD",\n'
        '  "periodo_facturacion_fin": "YYYY-MM-DD",\n'
        '  "consumo_kwh": número o null,\n'
        '  "importe_total_eur": número o null,\n'
        '  "importe_energia_eur": número o null,\n'
        '  "importe_potencia_eur": número o null,\n'
        '  "impuesto_electrico_eur": número o null,\n'
        '  "iva_eur": número o null,\n'
        '  "resumen": "frase de 1-2 líneas con tu conclusión sobre la factura y posibles ahorros"\n'
        "}\n\nDevuelve solo el JSON, nada más."
    )

    chat = (
        LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"ocr-{uuid.uuid4()}", system_message=system)
        .with_model("gemini", "gemini-3-pro-preview")
    )
    file_content = FileContentWithMimeType(file_path=file_path, mime_type=mime_type)

    try:
        resp = await chat.send_message(UserMessage(text=prompt, file_contents=[file_content]))
        text = str(resp).strip()
        # try to extract JSON
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                data = json.loads(match.group(0))
                return {"data": data, "raw": text}
            except json.JSONDecodeError:
                return {"raw": text, "parse_error": True}
        return {"raw": text}
    except Exception as e:
        log.exception("OCR error")
        return {"error": str(e)}

@api.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    cliente_id: Optional[str] = Form(None),
    tipo: str = Form("factura"),
    user: dict = Depends(get_current_user),
):
    content = await file.read()
    size = len(content)
    if size > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande (max 12MB)")

    mime = file.content_type or "application/octet-stream"
    is_image = mime.startswith("image/") or mime == "application/pdf"

    doc_id = str(uuid.uuid4())
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename or "doc")
    file_ext = Path(safe_name).suffix or ""
    saved_path = ROOT_DIR / "uploads" / f"{doc_id}{file_ext}"
    saved_path.write_bytes(content)

    extracted = None
    ocr_status = "skipped"
    if tipo == "factura" and is_image:
        ocr_status = "processing"
        result = await run_ocr_gemini(str(saved_path), mime)
        if "data" in result:
            extracted = result["data"]
            ocr_status = "completed"
        elif "error" in result:
            ocr_status = "failed"
            extracted = {"error": result["error"], "raw": result.get("raw", "")}
        else:
            ocr_status = "partial"
            extracted = {"raw": result.get("raw", "")}

        # Auto-fill client CUPS if missing
        if cliente_id and isinstance(extracted, dict) and extracted.get("cups"):
            cli = await db.clients.find_one({"_id": ObjectId(cliente_id)})
            if cli and not cli.get("cups"):
                await db.clients.update_one(
                    {"_id": ObjectId(cliente_id)},
                    {"$set": {"cups": extracted["cups"]}}
                )

    doc = {
        "cliente_id": cliente_id,
        "nombre": file.filename,
        "tipo": tipo,
        "mime_type": mime,
        "size": size,
        "file_path": str(saved_path),
        "extracted_data": extracted,
        "ocr_status": ocr_status,
        "uploaded_by": user["id"],
        "created_at": now_iso(),
    }
    res = await db.documents.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_document(doc)

# ============ DASHBOARD ============

@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc).isoformat()
    in_30 = (today + timedelta(days=30)).date().isoformat()
    today_iso = today.date().isoformat()

    client_filter = {"comercial_id": user["id"]} if user["role"] == "comercial" else {}

    total_clients = await db.clients.count_documents(client_filter)
    active_clients = await db.clients.count_documents({**client_filter, "estado": "cliente_activo"})
    nuevos_leads = await db.clients.count_documents({**client_filter, "estado": "nuevo_lead"})
    sin_ahorro = await db.clients.count_documents({**client_filter, "estado": "sin_ahorro"})
    renovaciones = await db.clients.count_documents({**client_filter, "estado": "renovacion"})
    con_ahorro = await db.clients.count_documents({**client_filter, "tiene_ahorro": True})

    # Contracts upcoming renewal in 30 days
    upcoming = await db.contracts.count_documents({
        "fecha_renovacion": {"$gte": today_iso, "$lte": in_30}
    })

    # Sum savings
    pipeline = [
        {"$match": {**client_filter, "tiene_ahorro": True}},
        {"$group": {"_id": None, "total": {"$sum": "$ahorro_estimado"}}}
    ]
    agg = await db.clients.aggregate(pipeline).to_list(1)
    total_ahorro = float(agg[0]["total"]) if agg else 0.0

    # Conversion rate (clientes activos / total)
    conversion = round((active_clients / total_clients) * 100, 1) if total_clients else 0.0

    # By state distribution
    state_dist = []
    for s in CRM_STATES:
        count = await db.clients.count_documents({**client_filter, "estado": s})
        state_dist.append({"estado": s, "count": count})

    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "nuevos_leads": nuevos_leads,
        "sin_ahorro": sin_ahorro,
        "renovaciones": renovaciones,
        "con_ahorro": con_ahorro,
        "upcoming_renewals_30d": upcoming,
        "total_ahorro": total_ahorro,
        "conversion_rate": conversion,
        "state_distribution": state_dist,
    }

@api.get("/dashboard/alerts")
async def dashboard_alerts(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    in_60 = (today + timedelta(days=60)).isoformat()
    in_180 = (today + timedelta(days=180)).isoformat()
    today_iso = today.isoformat()

    # Urgent: renovacion in next 60 days
    contracts = await db.contracts.find({
        "fecha_renovacion": {"$gte": today_iso, "$lte": in_60}
    }).sort("fecha_renovacion", 1).to_list(50)

    cli_ids = list({c["cliente_id"] for c in contracts if c.get("cliente_id")})
    clients = await db.clients.find({"_id": {"$in": [ObjectId(i) for i in cli_ids]}}).to_list(500) if cli_ids else []
    cmap = {str(c["_id"]): c for c in clients}

    items = []
    for c in contracts:
        cli = cmap.get(c.get("cliente_id", ""))
        if not cli:
            continue
        if user["role"] == "comercial" and cli.get("comercial_id") != user["id"]:
            continue
        days = (datetime.fromisoformat(c["fecha_renovacion"]).date() - today).days
        items.append({
            "type": "renewal",
            "level": "urgent" if days <= 30 else "warning",
            "contract_id": str(c["_id"]),
            "client_id": str(cli["_id"]),
            "client_name": cli.get("nombre", ""),
            "comercializadora": c.get("comercializadora", ""),
            "fecha_renovacion": c.get("fecha_renovacion"),
            "days_until": days,
        })

    return {"alerts": items, "count": len(items)}

@api.get("/renovations/upcoming")
async def upcoming_renovations(days: int = 180, user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    end = (today + timedelta(days=days)).isoformat()
    today_iso = today.isoformat()

    contracts = await db.contracts.find({
        "fecha_renovacion": {"$gte": today_iso, "$lte": end}
    }).sort("fecha_renovacion", 1).to_list(500)

    cli_ids = list({c["cliente_id"] for c in contracts if c.get("cliente_id")})
    clients = await db.clients.find({"_id": {"$in": [ObjectId(i) for i in cli_ids]}}).to_list(1000) if cli_ids else []
    cmap = {str(c["_id"]): c for c in clients}

    result = []
    for c in contracts:
        cli = cmap.get(c.get("cliente_id", ""))
        if not cli:
            continue
        if user["role"] == "comercial" and cli.get("comercial_id") != user["id"]:
            continue
        days_until = (datetime.fromisoformat(c["fecha_renovacion"]).date() - today).days
        result.append({
            "contract_id": str(c["_id"]),
            "client_id": str(cli["_id"]),
            "client_name": cli.get("nombre", ""),
            "comercial_id": cli.get("comercial_id"),
            "comercializadora": c.get("comercializadora", ""),
            "tarifa": c.get("tarifa", ""),
            "fecha_renovacion": c.get("fecha_renovacion"),
            "days_until": days_until,
            "importe_anual": c.get("importe_anual", 0),
        })
    return result

# ============ NOTIFICATIONS ============

@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [{
        "id": str(n["_id"]),
        "title": n.get("title", ""),
        "body": n.get("body", ""),
        "level": n.get("level", "info"),
        "read": n.get("read", False),
        "link": n.get("link", ""),
        "created_at": n.get("created_at"),
    } for n in items]

@api.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"_id": ObjectId(notif_id), "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

async def create_notification(user_id: str, title: str, body: str, level: str = "info", link: str = ""):
    await db.notifications.insert_one({
        "user_id": user_id, "title": title, "body": body,
        "level": level, "link": link, "read": False, "created_at": now_iso(),
    })

# ============ EMAIL (Resend) ============

async def send_email(to: str, subject: str, html: str) -> dict:
    """Send an email via Resend. Returns dict with status + id/error."""
    if not RESEND_API_KEY:
        log.info(f"[STUB-EMAIL] To: {to} | Subject: {subject}")
        return {"status": "stub", "id": None}
    if not to or "@" not in to:
        return {"status": "skipped", "reason": "invalid_recipient"}
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "id": result.get("id") if isinstance(result, dict) else None}
    except Exception as e:
        log.warning(f"Resend send failed to {to}: {e}")
        return {"status": "failed", "error": str(e)}

def renewal_email_html(client_name: str, comercializadora: str, fecha_renovacion: str, days: int, comercial_name: str = "tu comercial") -> str:
    accent = "#F97316"
    return f"""
    <!doctype html>
    <html><body style="margin:0;padding:0;background:#fafafa;font-family:Inter,Arial,sans-serif;color:#18181b">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px">
        <tr><td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
            <tr><td style="padding:24px 28px;border-bottom:1px solid #f4f4f5">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-weight:700;font-size:14px;color:#18181b;letter-spacing:-0.01em">⚡ AlgoMásQueLuz</td>
                <td align="right" style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#a1a1aa;font-weight:600">Renovación próxima</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:32px 28px">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:{accent};font-weight:700;margin-bottom:10px">{days} días para vencimiento</div>
              <h1 style="font-size:22px;margin:0 0 12px 0;font-weight:700;letter-spacing:-0.01em;color:#09090b">Hola,</h1>
              <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0 0 20px 0">
                El contrato energético de <strong style="color:#09090b">{client_name}</strong> con <strong style="color:#09090b">{comercializadora}</strong> vencerá el
                <strong style="color:#09090b">{fecha_renovacion}</strong>.
              </p>
              <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0 0 24px 0">
                Quedan <strong>{days} días</strong>. Es buen momento para revisar el mercado, comparar tarifas y proponer la mejor renovación o el cambio óptimo de comercializadora.
              </p>
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="background:#09090b;border-radius:6px">
                  <a href="{FRONTEND_URL}/renovaciones" style="display:inline-block;padding:11px 20px;color:#fff;font-size:13px;font-weight:600;text-decoration:none">Ver renovaciones →</a>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #f4f4f5;font-size:11px;color:#a1a1aa">
              Asignado a {comercial_name} · AlgoMásQueLuz Sistema Operativo
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
    """

# ============ AUTOMATIONS (manual trigger for demo) ============

@api.post("/automations/preview-renewal-email")
async def preview_renewal_email(to: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    """Send a sample renewal email to verify Resend works. Defaults to the admin email or 'to' query param."""
    recipient = to or user["email"]
    html = renewal_email_html(
        client_name="Panadería La Esquina (DEMO)",
        comercializadora="Endesa",
        fecha_renovacion="2026-05-27",
        days=9,
        comercial_name="Carlos Pérez",
    )
    res = await send_email(recipient, "⚡ [Preview] Renovación en 9d — Panadería La Esquina", html)
    return {"recipient": recipient, **res}

@api.post("/automations/run-renewal-check")
async def run_renewal_check(user: dict = Depends(get_current_user)):
    """Scan contracts whose renewal is in <= 60 days and create notifications + stub email/whatsapp."""
    today = datetime.now(timezone.utc).date()
    in_60 = (today + timedelta(days=60)).isoformat()
    today_iso = today.isoformat()

    contracts = await db.contracts.find({
        "fecha_renovacion": {"$gte": today_iso, "$lte": in_60}
    }).to_list(500)

    created = 0
    emails_sent = 0
    emails_failed = 0
    for c in contracts:
        cli = await db.clients.find_one({"_id": ObjectId(c["cliente_id"])})
        if not cli or not cli.get("comercial_id"):
            continue
        days = (datetime.fromisoformat(c["fecha_renovacion"]).date() - today).days
        level = "urgent" if days <= 30 else "warning"

        comercial = await db.users.find_one({"_id": ObjectId(cli["comercial_id"])})
        comercial_name = comercial.get("name", "tu comercial") if comercial else "tu comercial"
        comercial_email = comercial.get("email", "") if comercial else ""

        await create_notification(
            user_id=cli["comercial_id"],
            title=f"Renovación próxima: {cli['nombre']}",
            body=f"Contrato con {c.get('comercializadora', '?')} vence el {c['fecha_renovacion']} ({days} días).",
            level=level,
            link=f"/clientes/{cli['_id']}",
        )

        # Email to comercial (Resend)
        if comercial_email:
            html = renewal_email_html(
                client_name=cli["nombre"],
                comercializadora=c.get("comercializadora", "?"),
                fecha_renovacion=c["fecha_renovacion"],
                days=days,
                comercial_name=comercial_name,
            )
            subject = f"⚡ Renovación en {days}d — {cli['nombre']}"
            res = await send_email(comercial_email, subject, html)
            if res.get("status") == "sent":
                emails_sent += 1
            elif res.get("status") == "failed":
                emails_failed += 1

        # WhatsApp still stubbed
        log.info(f"[STUB-WHATSAPP] To: {cli.get('telefono')} - Aviso renovación {cli['nombre']}")
        created += 1

    return {
        "ok": True,
        "notifications_created": created,
        "contracts_scanned": len(contracts),
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "email_provider": "resend" if RESEND_API_KEY else "stub",
    }

# ============ META ============

@api.get("/meta/options")
async def meta_options(user: dict = Depends(get_current_user)):
    return {
        "roles": ROLES,
        "crm_states": CRM_STATES,
        "provincias": PROVINCIAS,
        "comercializadoras": COMERCIALIZADORAS,
    }

@api.get("/")
async def root():
    return {"app": "AlgoMásQueLuz OS", "ok": True}

# include router
app.include_router(api)

# CORS — credentials require explicit origins
allowed_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
