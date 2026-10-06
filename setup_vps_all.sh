#!/bin/bash

# ⚡ Instalador Todo en Uno — CRM AlgoMásQueLuz (Base de Datos + Backend)
# Este script instala MongoDB localmente, configura el backend de Python y crea el servicio systemd.
# Ejecútalo en tu VPS con: sudo bash setup_vps_all.sh

echo "=========================================================="
echo "🚀 INICIANDO INSTALACIÓN AUTOMÁTICA DE BASE DE DATOS Y CRM"
echo "=========================================================="

# 1. Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Por favor, ejecuta este script como root (usando sudo)."
  exit 1
fi

# Detectar el directorio actual
BACKEND_DIR=$(pwd)
echo "📍 Carpeta de instalación: $BACKEND_DIR"

# 2. DETECTAR SISTEMA OPERATIVO E INSTALAR MONGODB
echo "🔍 Detectando Sistema Operativo para instalar MongoDB..."

if [ -f /etc/debian_version ]; then
    OS_NAME=$(lsb_release -is 2>/dev/null || cat /etc/os-release | grep ^ID= | cut -d= -f2 | tr -d '"')
    CODENAME=$(lsb_release -cs 2>/dev/null || cat /etc/os-release | grep ^VERSION_CODENAME= | cut -d= -f2)
    echo "📋 Sistema detectado: Debian/Ubuntu ($OS_NAME - $CODENAME)"
    
    # Importar clave GPG de MongoDB
    apt-get update
    apt-get install -y gnupg curl
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
    
    if [ "$OS_NAME" == "Ubuntu" ] || [ "$OS_NAME" == "ubuntu" ]; then
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    else
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian $CODENAME/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    fi
    
    apt-get update
    echo "📥 Instalando MongoDB..."
    apt-get install -y mongodb-org

elif [ -f /etc/redhat-release ]; then
    echo "📋 Sistema detectado: RedHat/Rocky/AlmaLinux/CentOS"
    
    cat <<EOT > /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOT
    
    echo "📥 Instalando MongoDB..."
    yum install -y mongodb-org
else
    echo "❌ Error: Sistema operativo no soportado automáticamente para instalar MongoDB."
    echo "Intenta instalarlo manualmente antes de correr este script."
    exit 1
fi

# 3. INICIAR Y HABILITAR MONGODB
echo "⚙️ Iniciando servicio de MongoDB..."
systemctl daemon-reload
systemctl start mongod
systemctl enable mongod

# Verificar si MongoDB arrancó correctamente
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB está activo y conectado localmente en el puerto 27017."
else
    echo "❌ Error: MongoDB no pudo arrancar. Revisa los logs con: sudo journalctl -u mongod"
    exit 1
fi

# 4. INSTALAR DEPENDENCIAS DE PYTHON
echo "🐍 Instalando dependencias de Python y entorno virtual..."
if [ -f /etc/debian_version ]; then
    apt-get install -y python3 python3-pip python3-venv
elif [ -f /etc/redhat-release ]; then
    yum install -y python3 python3-pip
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# 5. CONFIGURAR ARCHIVO DE ENTORNO .ENV
echo "📝 Configurando variables de entorno (.env)..."
if [ ! -f ".env" ]; then
    cat <<EOT > .env
PORT=8001
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=algomasqueluz_db
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "aml_super_secret_key_32_chars_long")
ADMIN_EMAIL=admin@algomasqueluz.com
ADMIN_PASSWORD=Admin123!
EMERGENT_LLM_KEY=tu_llm_key_aqui
RESEND_API_KEY=tu_resend_key_aqui
SENDER_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:3000
EOT
    echo "✅ Archivo .env configurado con conexión local a MongoDB."
else
    # Si ya existe, aseguramos que apunte al puerto local
    sed -i 's|MONGO_URL=.*|MONGO_URL=mongodb://127.0.0.1:27017|g' .env
    echo "✅ Archivo .env actualizado para apuntar al MongoDB local."
fi

# 6. CREAR SERVICIO SYSTEMD
echo "⚙️ Configurando el servicio de sistema (crm-backend.service)..."
SERVICE_FILE="/etc/systemd/system/crm-backend.service"

cat <<EOT > $SERVICE_FILE
[Unit]
Description=FastAPI Backend CRM AlgoMásQueLuz
After=network.target

[Service]
User=root
WorkingDirectory=$BACKEND_DIR
ExecStart=$BACKEND_DIR/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOT

# Recargar servicios e iniciar
systemctl daemon-reload
systemctl enable crm-backend.service
systemctl restart crm-backend.service

echo "=========================================================="
echo "🎉 ¡TODO INSTALADO Y CONECTADO CON ÉXITO!"
echo "=========================================================="
echo "📊 Estado del servicio backend:"
systemctl status crm-backend --no-pager
echo "=========================================================="
echo "📍 Base de Datos (MongoDB): Instalada y Conectada localmente."
echo "📍 Backend (FastAPI): Corriendo en http://127.0.0.1:8001"
echo "👉 Edita tu archivo '.env' para añadir tus claves de IA o Email con: nano .env"
echo "=========================================================="
