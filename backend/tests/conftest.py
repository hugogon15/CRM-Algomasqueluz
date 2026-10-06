import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://power-ops-2.preview.emergentagent.com").rstrip("/")


def _login(session, email, password):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def fresh_session():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = _login(s, "admin@algomasqueluz.com", "Admin123!")
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="session")
def comercial_session():
    s = requests.Session()
    r = _login(s, "carlos.comercial@algomasqueluz.com", "Demo123!")
    if r.status_code != 200:
        pytest.skip(f"Comercial login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="session")
def gestor_session():
    s = requests.Session()
    r = _login(s, "lucia.gestor@algomasqueluz.com", "Demo123!")
    if r.status_code != 200:
        pytest.skip(f"Gestor login failed: {r.status_code} {r.text}")
    return s
