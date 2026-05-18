# AlgoMásQueLuz — Sistema Operativo

## Problem Statement
Construir el "Sistema Operativo AlgoMásQueLuz" — una plataforma empresarial para una empresa española de consultoría energética. CRM de clientes energéticos, contratos, documentos con OCR IA, dashboard ejecutivo, sistema de renovaciones automáticas, pipeline kanban comercial y gestión de roles.

## Stack
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + Tailwind + Shadcn UI + @hello-pangea/dnd + Recharts
- Auth: JWT (httpOnly cookies) + bcrypt
- IA: Gemini 3 Pro vía Emergent Universal LLM Key (OCR facturas)

## Architecture
- Single `server.py` con todas las rutas bajo `/api`
- 4 roles: admin, comercial, gestor, backoffice
- Comercial ve solo sus propios clientes; gestor/admin ven todo
- 6 estados CRM: nuevo_lead, pendiente_estudio, enviado, renovacion, cliente_activo, sin_ahorro

## User Personas
- **Admin**: configura usuarios, ve toda la cartera, ejecuta automatizaciones
- **Comercial**: gestiona su pipeline de clientes
- **Gestor**: gestiona renovaciones y contratos
- **Backoffice**: gestiona documentación

## Implemented (2026-02-18)
- ✅ Auth JWT con cookies httpOnly, 4 roles, brute-force protection
- ✅ Seed admin + 3 demo users + 12 clientes + ~7 contratos
- ✅ CRM clientes (CRUD, búsqueda, filtros) con permisos por rol
- ✅ Pipeline Kanban con drag&drop entre 6 estados
- ✅ Contratos CRUD + lista global ordenada por renovación
- ✅ Dashboard con 5 KPIs, gráfico distribución, alertas, próximas renovaciones
- ✅ Sistema de renovaciones (lista priorizada + calendar view)
- ✅ Documentos: upload + OCR Gemini 3 Pro (campos: cups, comercializadora, tarifa, importe, consumo, periodo…)
- ✅ Auto-fill CUPS al cliente si extraído por OCR
- ✅ Notificaciones in-app con contador
- ✅ Automatización manual `/api/automations/run-renewal-check` (60d) — crea notifs + log stub email/whatsapp
- ✅ Gestión usuarios/equipo (admin)
- ✅ Tema light Swiss/high-contrast, datos densos, font Satoshi+Inter+JetBrains Mono
- ✅ Login split-screen con brand panel

## Endpoints
- `/api/auth/*` — login, logout, me, refresh, register
- `/api/users` — list / patch / delete (admin)
- `/api/clients` — CRUD + filtros q/estado/comercial
- `/api/contracts` — CRUD
- `/api/documents` — list / delete / upload (con OCR)
- `/api/dashboard/stats` — KPIs
- `/api/dashboard/alerts` — renovaciones urgentes (60d)
- `/api/renovations/upcoming?days=` — lista renovaciones
- `/api/notifications` — list / mark read
- `/api/automations/run-renewal-check` — escaneo manual
- `/api/meta/options` — provincias, comercializadoras, estados, roles

## Backlog (P1)
- Activar Resend (email) cuando user proporcione API key
- Activar Twilio WhatsApp cuando user proporcione Account SID + Token + número
- Cron job real (scheduler) para automatización renovaciones (ahora manual desde topbar)
- Reset password flow (endpoints existen, falta UI)
- Logs de actividad por cliente (timeline)
- Exportar CSV de cartera

## Backlog (P2)
- Importación masiva CSV de clientes
- Asignación masiva de comercial
- Estudios de ahorro (PDF generado)
- Dashboard analítico avanzado (gráficos temporales)
- Plantillas de scripts comerciales
