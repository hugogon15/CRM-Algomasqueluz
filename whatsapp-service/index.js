const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const app = express();
app.use(express.json());

// Evitar que el servicio se caiga por excepciones o timeouts internos de Baileys
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promesa no capturada (Unhandled Rejection) en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Excepción no capturada (Uncaught Exception):', error);
});

const PORT = process.env.PORT || 8002;
const AUTH_DIR = path.join(__dirname, 'auth_info');
const QR_PATH = path.join(__dirname, 'qr.png');

let sock = null;
let qrCodeString = null;
let connectionStatus = 'disconnected'; // disconnected, connecting, qr, connected

// Configure log level to reduce noise
const logger = pino({ level: 'info' });

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  
  connectionStatus = 'connecting';
  
  let version = [2, 3000, 1017531287]; // fallback version
  try {
    const { version: latestVersion, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using latest WhatsApp Web version: ${latestVersion.join('.')}, isLatest: ${isLatest}`);
    version = latestVersion;
  } catch (err) {
    console.warn('Failed to fetch latest WhatsApp version, using fallback:', err.message);
  }
  
  sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: true,
    logger
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCodeString = qr;
      connectionStatus = 'qr';
      // Generate QR image
      try {
        await QRCode.toFile(QR_PATH, qr);
        console.log('New WhatsApp QR Code generated and saved to qr.png');
      } catch (err) {
        console.error('Failed to generate QR file:', err);
      }
    }

    if (connection === 'close') {
      qrCodeString = null;
      // Delete QR file if it exists
      if (fs.existsSync(QR_PATH)) {
        try { fs.unlinkSync(QR_PATH); } catch (e) {}
      }
      
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting: ', shouldReconnect);
      connectionStatus = 'disconnected';
      
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log('Logged out from WhatsApp. Please delete auth_info and scan QR again.');
        // Clear auth directory
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (e) {}
        setTimeout(connectToWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connection successfully opened!');
      connectionStatus = 'connected';
      qrCodeString = null;
      if (fs.existsSync(QR_PATH)) {
        try { fs.unlinkSync(QR_PATH); } catch (e) {}
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// 1. Endpoint status
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qrAvailable: !!qrCodeString
  });
});

// 2. HTML view for scanning QR code
app.get('/qr', (req, res) => {
  if (connectionStatus === 'connected') {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Web CRM - Conectado</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background: #f4f5f8; }
          .card { background: white; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .status { color: #15803d; font-weight: bold; font-size: 1.2rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚡ WhatsApp Web CRM</h2>
          <p class="status">✅ CONECTADO EXITOSAMENTE</p>
          <p>El CRM ya está enviando alertas a través de tu número de WhatsApp.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (connectionStatus === 'qr' && fs.existsSync(QR_PATH)) {
    // Read QR image and send as base64
    const qrImage = fs.readFileSync(QR_PATH);
    const base64Image = qrImage.toString('base64');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Web CRM - Vincular Dispositivo</title>
        <meta http-equiv="refresh" content="5">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 40px; background: #f4f5f8; }
          .card { background: white; padding: 40px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 450px; }
          img { border: 1px solid #e4e4e7; padding: 10px; border-radius: 8px; margin: 20px 0; background: white; }
          .instruction { font-size: 0.95rem; color: #52525b; line-height: 1.5; }
          .highlight { font-weight: bold; color: #ff5722; }
          .loader { font-size: 0.85rem; color: #a1a1aa; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚡ Vincular WhatsApp CRM</h2>
          <p class="instruction">Abre WhatsApp en tu móvil, ve a <span class="highlight">Dispositivos vinculados</span> y escanea este código QR:</p>
          <img src="data:image/png;base64,${base64Image}" width="250" height="250" alt="Código QR WhatsApp" />
          <p class="instruction">Esta página se actualiza automáticamente cada 5 segundos para mantener el QR activo.</p>
          <div class="loader">Esperando escaneo...</div>
        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Web CRM - Conectando</title>
      <meta http-equiv="refresh" content="3">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background: #f4f5f8; }
        .card { background: white; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>⚡ WhatsApp Web CRM</h2>
        <p>Iniciando conexión con WhatsApp...</p>
        <p>Por favor espera, generando código QR.</p>
      </div>
    </body>
    </html>
  `);
});

// 3. Endpoint to send messages
app.post('/send', async (req, res) => {
  // Authentication check
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  if (secret) {
    const incomingSecret = req.headers['x-whatsapp-service-secret'];
    if (incomingSecret !== secret) {
      return res.status(401).json({ error: 'No autorizado: El token secreto es inválido.' });
    }
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ error: 'El servicio de WhatsApp no está conectado o el dispositivo no ha sido vinculado.' });
  }

  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Se requieren los campos "phone" y "message" en el body.' });
  }

  try {
    // Format the phone number to whatsapp JID format (e.g. 34688431671@s.whatsapp.net)
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Add default country prefix if not present (Spain prefix: 34)
    if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('7'))) {
      cleanPhone = '34' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    
    console.log(`Sending message to: ${jid}`);
    await sock.sendMessage(jid, { text: message });
    
    res.json({ success: true, message: 'Mensaje enviado correctamente a través de WhatsApp Web.' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje de WhatsApp.', details: error.message });
  }
});

// Start WhatsApp connection
connectToWhatsApp();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`WhatsApp microservice is running locally on http://127.0.0.1:${PORT}`);
});
