#!/bin/bash

# ⚡ Script de Automatización de Despliegue Backend CRM — AlgoMásQueLuz
# Sube este archivo a la carpeta del backend en tu VPS (/var/www/vhosts/tudominio.com/backend/deploy_vps.sh)
# y ejecútalo con: sudo bash deploy_vps.sh

echo "====================================================="
echo "🚀 Iniciando despliegue de AlgoMásQueLuz Backend..."
echo "====================================================="

# 1. Verificar permisos de root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Por favor, ejecuta este script como root (usando sudo)."
  exit 1
fi

# Obtener directorio actual
BACKEND_DIR=$(pwd)
echo "📍 Directorio actual de trabajo: $BACKEND_DIR"

# 2. Comprobar e instalar Python 3 y venv si faltan
echo "🔍 Comprobando dependencias del sistema..."
if ! command -v python3 &> /dev/null; then
    echo "📦 Instalando Python 3..."
    if [ -f /etc/debian_version ]; then
        apt-get update && apt-get install -y python3 python3-pip python3-venv
    elif [ -f /etc/redhat-release ]; then
        yum install -y python3 python3-pip
    fi
else
    echo "✅ Python 3 ya está instalado."
fi

# 3. Crear entorno virtual
echo "🐍 Configurando entorno virtual de Python (venv)..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Entorno virtual 'venv' creado."
else
    echo "ℹ️ El entorno virtual 'venv' ya existe."
fi

# 4. Instalar dependencias
echo "📥 Instalando requerimientos de FastAPI..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas con éxito."
else
    echo "❌ Error instalando dependencias. Verifica requirements.txt."
    exit 1
fi

# 5. Crear archivo .env si no existe
echo "📝 Comprobando archivo de configuración (.env)..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️ Se ha creado un archivo '.env' genérico."
    echo "⚠️ RECUERDA EDITARLO con 'nano .env' para poner tus contraseñas reales y URLs."
else
    echo "✅ Archivo '.env' existente detectado."
fi

# 6. Configurar el servicio systemd para que corra en segundo plano
echo "⚙️ Configurando el servicio systemd (crm-backend.service)..."
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

# 7. Recargar daemon e iniciar servicio
echo "🔄 Activando e iniciando el servicio..."
systemctl daemon-reload
systemctl enable crm-backend.service
systemctl restart crm-backend.service

# 8. Comprobar estado
echo "====================================================="
echo "📊 Estado del servicio backend:"
echo "====================================================="
systemctl status crm-backend --no-pager

echo "====================================================="
echo "🎉 ¡Despliegue de Backend Completado!"
echo "📍 Backend corriendo localmente en: http://127.0.0.1:8001"
echo "👉 Ahora puedes ir a Plesk y configurar el Proxy Inverso Nginx en tu dominio."
echo "====================================================="
