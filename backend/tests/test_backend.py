"""Comprehensive backend tests for AlgoMásQueLuz OS."""
import os
import io
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://power-ops-2.preview.emergentagent.com").rstrip("/")


# ----- AUTH -----
class TestAuth:
    def test_login_admin_sets_cookies(self, fresh_session):
        r = fresh_session.post(f"{BASE_URL}/api/auth/login",
                               json={"email": "admin@algomasqueluz.com", "password": "Admin123!"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == "admin@algomasqueluz.com"
        assert data["user"]["role"] == "admin"
        assert "access_token" in fresh_session.cookies
        assert "refresh_token" in fresh_session.cookies

    def test_me_after_login(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_unauthenticated(self, fresh_session):
        r = fresh_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_login_invalid(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": "admin@algomasqueluz.com", "password": "WrongPass"})
        assert r.status_code == 401

    def test_logout_clears_session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login",
               json={"email": "lucia.gestor@algomasqueluz.com", "password": "Demo123!"})
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # cookies should be cleared; subsequent /me should be 401
        r2 = s.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 401

    def test_brute_force_lockout(self):
        """5 wrong attempts on a unique identifier should return 429."""
        s = requests.Session()
        # Use a fake email to not affect real account lockout for shared IP
        fake_email = f"bruteforce_{int(time.time())}@test.com"
        last_status = None
        for i in range(6):
            r = s.post(f"{BASE_URL}/api/auth/login",
                       json={"email": fake_email, "password": "Wrong"})
            last_status = r.status_code
        # After 5 attempts, 6th should be locked → 429
        assert last_status == 429, f"Expected 429 after 6 attempts, got {last_status}"

    def test_register_blocked_for_non_admin(self, comercial_session):
        r = comercial_session.post(f"{BASE_URL}/api/auth/register",
                                   json={"email": "x@x.com", "password": "abc123", "name": "X", "role": "comercial"})
        assert r.status_code == 403


# ----- CLIENTS -----
class TestClients:
    def test_list_clients_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/clients")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 12, f"Expected >=12 seeded clients, got {len(data)}"
        # comercial_name should be populated
        with_name = [c for c in data if c.get("comercial_name")]
        assert len(with_name) > 0, "Expected at least some clients with comercial_name"

    def test_list_clients_comercial_only_sees_own(self, comercial_session):
        r = comercial_session.get(f"{BASE_URL}/api/clients")
        assert r.status_code == 200
        data = r.json()
        # carlos should see his clients only
        me = comercial_session.get(f"{BASE_URL}/api/auth/me").json()
        for c in data:
            assert c["comercial_id"] == me["id"], f"Comercial seeing other's client: {c}"

    def test_search_clients(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/clients", params={"q": "Panadería"})
        assert r.status_code == 200
        data = r.json()
        assert any("Panadería" in c["nombre"] for c in data)

    def test_filter_by_estado(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/clients", params={"estado": "cliente_activo"})
        assert r.status_code == 200
        for c in r.json():
            assert c["estado"] == "cliente_activo"

    def test_create_and_get_client(self, admin_session):
        payload = {"nombre": "TEST_Cliente_X", "telefono": "+34 600 000 000",
                   "email": "test@test.com", "estado": "nuevo_lead", "provincia": "Madrid"}
        r = admin_session.post(f"{BASE_URL}/api/clients", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["nombre"] == "TEST_Cliente_X"
        cid = created["id"]
        # GET
        r2 = admin_session.get(f"{BASE_URL}/api/clients/{cid}")
        assert r2.status_code == 200
        assert r2.json()["nombre"] == "TEST_Cliente_X"
        # PATCH
        r3 = admin_session.patch(f"{BASE_URL}/api/clients/{cid}", json={"estado": "enviado"})
        assert r3.status_code == 200
        assert r3.json()["estado"] == "enviado"
        # DELETE (admin allowed)
        r4 = admin_session.delete(f"{BASE_URL}/api/clients/{cid}")
        assert r4.status_code == 200
        # verify gone
        r5 = admin_session.get(f"{BASE_URL}/api/clients/{cid}")
        assert r5.status_code == 404

    def test_delete_blocked_for_comercial(self, comercial_session, admin_session):
        # admin creates
        r = admin_session.post(f"{BASE_URL}/api/clients", json={"nombre": "TEST_DeleteBlock", "estado": "nuevo_lead"})
        cid = r.json()["id"]
        try:
            r2 = comercial_session.delete(f"{BASE_URL}/api/clients/{cid}")
            assert r2.status_code == 403
        finally:
            admin_session.delete(f"{BASE_URL}/api/clients/{cid}")


# ----- CONTRACTS -----
class TestContracts:
    def test_list_contracts_sorted(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/contracts")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        renovaciones = [c["fecha_renovacion"] for c in data]
        assert renovaciones == sorted(renovaciones), "Contracts not sorted by fecha_renovacion ASC"

    def test_create_update_delete_contract(self, admin_session):
        # need a client
        cr = admin_session.post(f"{BASE_URL}/api/clients",
                                json={"nombre": "TEST_ContractClient", "estado": "nuevo_lead"})
        cid = cr.json()["id"]
        try:
            payload = {"cliente_id": cid, "comercializadora": "Endesa", "tarifa": "2.0TD",
                       "potencia_contratada": 5.5, "fecha_inicio": "2025-01-01",
                       "fecha_renovacion": "2026-06-01", "permanencia_meses": 12, "importe_anual": 1200.0}
            r = admin_session.post(f"{BASE_URL}/api/contracts", json=payload)
            assert r.status_code == 200, r.text
            ctr = r.json()
            assert ctr["comercializadora"] == "Endesa"
            ctr_id = ctr["id"]

            # filter by cliente_id
            r2 = admin_session.get(f"{BASE_URL}/api/contracts", params={"cliente_id": cid})
            assert r2.status_code == 200
            assert any(c["id"] == ctr_id for c in r2.json())

            # patch
            r3 = admin_session.patch(f"{BASE_URL}/api/contracts/{ctr_id}", json={"tarifa": "3.0TD"})
            assert r3.status_code == 200
            assert r3.json()["tarifa"] == "3.0TD"

            # delete
            r4 = admin_session.delete(f"{BASE_URL}/api/contracts/{ctr_id}")
            assert r4.status_code == 200
        finally:
            admin_session.delete(f"{BASE_URL}/api/clients/{cid}")


# ----- DASHBOARD -----
class TestDashboard:
    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ["total_clients", "active_clients", "upcoming_renewals_30d", "conversion_rate", "state_distribution"]:
            assert k in data, f"Missing key {k}"
        assert data["total_clients"] >= 12

    def test_dashboard_alerts(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/alerts")
        assert r.status_code == 200
        data = r.json()
        assert "alerts" in data and "count" in data
        for alert in data["alerts"]:
            assert alert["level"] in ("urgent", "warning")
            assert "days_until" in alert

    def test_renovations_upcoming(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/renovations/upcoming", params={"days": 180})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # sorted ascending by days_until
        if len(data) >= 2:
            assert data[0]["days_until"] <= data[-1]["days_until"]
        for r_ in data:
            assert "days_until" in r_


# ----- USERS / META -----
class TestUsersMeta:
    def test_list_users_authenticated(self, comercial_session):
        r = comercial_session.get(f"{BASE_URL}/api/users")
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_register_admin_creates_user(self, admin_session):
        email = f"test_user_{int(time.time())}@test.com"
        r = admin_session.post(f"{BASE_URL}/api/auth/register",
                               json={"email": email, "password": "Test123!", "name": "TEST", "role": "comercial"})
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        # patch
        r2 = admin_session.patch(f"{BASE_URL}/api/users/{uid}", json={"name": "TEST Updated"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST Updated"
        # delete
        r3 = admin_session.delete(f"{BASE_URL}/api/users/{uid}")
        assert r3.status_code == 200

    def test_cannot_delete_self(self, admin_session):
        me = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        r = admin_session.delete(f"{BASE_URL}/api/users/{me['id']}")
        assert r.status_code == 400

    def test_meta_options(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/meta/options")
        assert r.status_code == 200
        data = r.json()
        for k in ["roles", "crm_states", "provincias", "comercializadoras"]:
            assert k in data and len(data[k]) > 0


# ----- NOTIFICATIONS & AUTOMATIONS -----
class TestNotifications:
    def test_run_renewal_check_creates(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/automations/run-renewal-check")
        assert r.status_code == 200
        data = r.json()
        assert "notifications_created" in data
        assert data["contracts_scanned"] >= 0

    def test_list_notifications(self, comercial_session, admin_session):
        # trigger first
        admin_session.post(f"{BASE_URL}/api/automations/run-renewal-check")
        r = comercial_session.get(f"{BASE_URL}/api/notifications")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ----- DOCUMENTS / OCR (non-blocking) -----
class TestDocuments:
    def test_upload_document_ocr_non_blocking(self, admin_session):
        """Upload tiny PNG; OCR call may succeed/fail but endpoint must save file."""
        # Minimal valid 1x1 PNG
        png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f0005000100b5e2f6e60000000049454e44ae426082")
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        data = {"tipo": "factura"}
        r = admin_session.post(f"{BASE_URL}/api/documents/upload", files=files, data=data, timeout=60)
        assert r.status_code == 200, f"Upload failed: {r.status_code} {r.text}"
        doc = r.json()
        assert doc["ocr_status"] in ("completed", "failed", "partial", "skipped"), f"Unexpected ocr_status: {doc['ocr_status']}"
        assert "id" in doc
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/documents/{doc['id']}")

    def test_list_documents(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/documents")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
