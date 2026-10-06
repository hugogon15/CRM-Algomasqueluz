const nodemailer = require('nodemailer');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // 1. Configurar cabeceras CORS dinámicas para restringir accesos cruzados maliciosos
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
    console.log(`Petición autorizada para el usuario: ${user.email}`);

  } catch (error) {
    console.error("Error al validar el token de autorización:", error);
    res.status(401).json({ error: 'Acceso no autorizado: Token inválido o corrupto' });
    return;
  }

  const { cliente_nombre, fecha_vencimiento, is_captacion, dias_restantes } = req.body;

  if (!cliente_nombre || !fecha_vencimiento) {
    res.status(400).json({ error: 'Nombre de cliente y fecha de vencimiento son requeridos' });
    return;
  }

  const isCaptacion = !!is_captacion;
  const diasStr = dias_restantes ? `${dias_restantes} días` : 'próximamente';

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('SMTP configuration missing in Environment Variables');
    res.status(500).json({ error: 'La configuración SMTP no está completa en el servidor de Vercel' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false // Bypass para evitar fallos si el certificado SSL de Plesk es autofirmado
    }
  });

  const mailOptions = {
    from: `"Alertas AlgoMásQueLuz" <${smtpUser}>`,
    to: 'estudios@algomasqueluz.com',
    subject: isCaptacion 
      ? `⚠️ Alerta de Captación [vence en ${diasStr}]: ${cliente_nombre}`
      : `🔔 Alerta de Renovación: ${cliente_nombre}`,
    html: isCaptacion ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #e11d48; border-bottom: 2px solid #f4f4f5; padding-bottom: 10px; font-weight: bold;">Alerta de Captación (Futura Captación)</h2>
        <p style="font-size: 14px; color: #3f3f46; line-height: 1.5;">El contrato del cliente sin ahorro <strong>${cliente_nombre}</strong> está próximo a expirar en su actual compañía:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #27272a; width: 180px;">Cliente / Empresa:</td>
            <td style="padding: 8px 0; color: #52525b;">${cliente_nombre}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #27272a;">Fecha Fin Contrato:</td>
            <td style="padding: 8px 0; color: #b91c1c; font-weight: bold;">${fecha_vencimiento}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #27272a;">Días Restantes:</td>
            <td style="padding: 8px 0; color: #e11d48; font-weight: bold;">${diasStr}</td>
          </tr>
        </table>
        <div style="margin-top: 30px; padding: 15px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 13px; color: #b45309; line-height: 1.4;">
          <strong>📋 Solicitud de Factura Requerida:</strong> Ponte en contacto con el cliente para solicitar su factura más reciente y revisar de nuevo en el CRM si ahora podemos conseguir un ahorro en su suministro eléctrico o de gas.
        </div>
        <p style="font-size: 11px; color: #a1a1aa; margin-top: 40px; border-top: 1px solid #f4f4f5; padding-top: 15px; text-align: center;">
          Este es un aviso automático de tu CRM corporativo en crm.algomasqueluz.com.
        </p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #09090b; border-bottom: 2px solid #f4f4f5; padding-bottom: 10px; font-weight: bold;">Aviso de Vencimiento de Contrato</h2>
        <p style="font-size: 14px; color: #71717a; line-height: 1.5;">Se ha programado una nueva alerta para un vencimiento de contrato de energía en tu cartera:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #27272a; width: 180px;">Cliente / Empresa:</td>
            <td style="padding: 8px 0; color: #52525b;">${cliente_nombre}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #27272a;">Fecha de Vencimiento:</td>
            <td style="padding: 8px 0; color: #b91c1c; font-weight: bold;">${fecha_vencimiento}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #27272a;">Aviso enviado a:</td>
            <td style="padding: 8px 0; color: #52525b;">estudios@algomasqueluz.com</td>
          </tr>
        </table>
        <div style="margin-top: 30px; padding: 15px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 13px; color: #15803d; line-height: 1.4;">
          <strong>💡 Recomendación:</strong> Ponte en contacto con el cliente 30 días antes del vencimiento para ofrecerle la mejor oferta de optimización energética de AlgoMásQueLuz SL.
        </div>
        <p style="font-size: 11px; color: #a1a1aa; margin-top: 40px; border-top: 1px solid #f4f4f5; padding-top: 15px; text-align: center;">
          Este es un aviso automático de tu CRM corporativo en crm.algomasqueluz.com.
        </p>
      </div>
    `

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    res.status(500).json({ error: 'Error al enviar el correo a través de tu SMTP', details: error.message });
  }
};
