const crypto = require('crypto');

module.exports = async (req, res) => {
  // 1. Configurar cabeceras CORS dinámicas
  const allowedOrigins = ['https://crm.algomasqueluz.com'];
  const origin = req.headers.origin;
  
  if (origin) {
    const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    if (allowedOrigins.includes(origin) || isLocal) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 2. Validación de Token de Autorización Seguro
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso no autorizado: No se proporcionó token de autorización' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || "aml-super-secret-signature-key-2026-!@#$";

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      res.status(401).json({ error: 'Acceso no autorizado: Formato de token inválido' });
      return;
    }

    const payloadBase64 = parts[0];
    const signature = parts[1];
    
    // Validar la firma criptográfica HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('hex');

    if (signature !== expectedSignature) {
      res.status(401).json({ error: 'Acceso no autorizado: Firma de token inválida' });
      return;
    }

    // Token verificado con éxito
    const user = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    console.log(`Petición de WhatsApp autorizada para el usuario: ${user.email}`);

  } catch (error) {
    console.error("Error al validar el token de autorización:", error);
    res.status(401).json({ error: 'Acceso no autorizado: Token inválido o corrupto' });
    return;
  }

  const { message, to } = req.body;

  if (!message) {
    res.status(400).json({ error: 'El mensaje es requerido' });
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || "whatsapp:+14155238886";
  const toNumber = to || process.env.WHATSAPP_TO_NUMBER || "+34616907629";

  // Forward to custom microservice if WHATSAPP_SERVICE_URL is defined
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL;
  const serviceSecret = process.env.WHATSAPP_SERVICE_SECRET;
  
  if (serviceUrl) {
    try {
      console.log(`Forwarding WhatsApp request to local microservice: ${serviceUrl}/send`);
      const response = await fetch(`${serviceUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-whatsapp-service-secret': serviceSecret || ''
        },
        body: JSON.stringify({
          phone: toNumber,
          message: message
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        res.status(200).json({ success: true, service: 'baileys-microservice', details: data });
        return;
      } else {
        res.status(response.status).json({ error: 'Error de WhatsApp Microservice', details: data });
        return;
      }
    } catch (error) {
      console.error('Error forwarding to WhatsApp microservice:', error);
      res.status(500).json({ error: 'Error de conexión con el microservicio de WhatsApp', details: error.message });
      return;
    }
  }

  if (!accountSid || !authToken) {
    console.warn('TWILIO configuration missing in Environment Variables. WhatsApp alert stubbed:');
    console.log(`[STUBBED WHATSAPP] To: ${toNumber} | Message: ${message}`);
    res.status(200).json({ success: true, status: 'stubbed', message: 'Variables de Twilio no configuradas. Mensaje registrado en logs.' });
    return;
  }

  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const formattedTo = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber.startsWith('+') ? toNumber : `+${toNumber}`}`;

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: formattedTo,
        Body: message
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('WhatsApp sent successfully via Twilio:', data.sid);
      res.status(200).json({ success: true, sid: data.sid });
    } else {
      console.error('Error sending WhatsApp via Twilio:', data);
      res.status(response.status).json({ error: 'Error de Twilio API', details: data });
    }
  } catch (error) {
    console.error('Error in send-whatsapp serverless function:', error);
    res.status(500).json({ error: 'Error interno de red al enviar WhatsApp', details: error.message });
  }
};
