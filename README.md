# ⚡ AlgoMásQueLuz — Sistema Operativo

CRM y sistema operativo empresarial para consultoría energética. Gestión de clientes, contratos, renovaciones automáticas y OCR de facturas con IA (Gemini 3 Pro).

## Stack
- **Frontend:** React 19, Tailwind, Shadcn UI, Recharts, @hello-pangea/dnd
- **Backend:** FastAPI + Motor (MongoDB async)
- **Auth:** JWT con cookies httpOnly + bcrypt, 4 roles (admin, comercial, gestor, backoffice)
- **IA:** Gemini 3 Pro vía emergentintegrations (OCR de facturas energéticas)
- **Email:** Resend (renovaciones automáticas)

## Estructura
```
/app
├── backend/        FastAPI (server.py)
├── frontend/       React app (src/pages, src/components, src/lib)
└── memory/         PRD + credenciales de prueba (no commitear test_credentials.md)
```

## Variables de entorno (.env — NO se commitea)

### backend/.env
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=algomasqueluz_db
JWT_SECRET=<random-64-hex>
ADMIN_EMAIL=admin@algomasqueluz.com
ADMIN_PASSWORD=<password>
EMERGENT_LLM_KEY=<tu-key>          # Para OCR con Gemini 3 Pro
RESEND_API_KEY=<tu-key>            # Para emails
SENDER_EMAIL=onboarding@resend.dev
FRONTEND_URL=https://tu-dominio.com
```

### frontend/.env
```
REACT_APP_BACKEND_URL=https://tu-dominio.com
```

## Endpoints principales
- `/api/auth/*` — login, logout, me, refresh, register
- `/api/clients` — CRUD + filtros (búsqueda, estado)
- `/api/contracts` — CRUD ordenado por renovación
- `/api/documents/upload` — Subida + OCR Gemini 3 Pro
- `/api/dashboard/stats` — KPIs ejecutivos
- `/api/renovations/upcoming` — Lista priorizada
- `/api/automations/run-renewal-check` — Escaneo manual + envío email

## Desarrollo local
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

## Funcionalidades
- ✅ Dashboard ejecutivo con KPIs, alertas y gráficos
- ✅ CRM clientes con búsqueda + filtros + aislamiento por comercial
- ✅ Pipeline Kanban con drag & drop entre 6 estados
- ✅ Contratos con vista global ordenada por renovación
- ✅ Renovaciones (lista priorizada + calendario)
- ✅ OCR IA de facturas energéticas (CUPS, comercializadora, tarifa, consumo, importes)
- ✅ Automatización de avisos por email (Resend) + notificaciones in-app
- ✅ Gestión de equipo (admin)
- ⏳ WhatsApp (Twilio) — pendiente keys

## Licencia
Propiedad de AlgoMásQueLuz · todos los derechos reservados.
