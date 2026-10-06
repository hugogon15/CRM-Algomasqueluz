# Auth Testing — AlgoMásQueLuz

## Credentials
- Admin: `admin@algomasqueluz.com` / `Admin123!` (role: admin)
- Demo: `carlos.comercial@algomasqueluz.com` / `Demo123!` (role: comercial)
- Demo: `lucia.gestor@algomasqueluz.com` / `Demo123!` (role: gestor)
- Demo: `marta.back@algomasqueluz.com` / `Demo123!` (role: backoffice)

## Endpoints
- POST `/api/auth/login` { email, password } → user + sets `access_token`+`refresh_token` cookies
- POST `/api/auth/logout` (auth required) → clears cookies
- GET `/api/auth/me` (auth required) → returns current user
- POST `/api/auth/refresh` (cookie refresh_token) → new access_token cookie
- POST `/api/auth/register` (admin only) { email, password, name, role }

## Cookies
- `httpOnly`, `Secure=True`, `SameSite=None` (required for cross-origin preview URL)

## CORS
- Allowed origin = `FRONTEND_URL` env var (no wildcards because credentials=true)

## Test flow
```bash
curl -c cookies.txt -X POST $API_URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@algomasqueluz.com","password":"Admin123!"}'
curl -b cookies.txt $API_URL/api/auth/me
curl -b cookies.txt $API_URL/api/dashboard/stats
```
