const crypto = require('crypto');

async function test() {
  console.log("Starting WhatsApp send test...");

  const user = {
    id: "416ed828-80c0-49a1-9788-d996104e5ef3",
    email: "hugo@algomasqueluz.com",
    name: "Hugo Gon",
    role: "admin"
  };

  const secret = "aml-super-secret-signature-key-2026-!@#$";
  const payloadBase64 = Buffer.from(JSON.stringify(user)).toString('base64');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('hex');
  
  const token = `${payloadBase64}.${signature}`;

  const url = "https://crm.algomasqueluz.com/api/send-whatsapp";
  const message = "🔔 *Alerta de Renovación - AlgoMásQueLuz CRM*\n\nHola Hugo, el contrato de tu cliente *Gimnasio FitZone* (CUPS: ES0088000000889900QR) vence en *30 días* (07/07/2026).\n\n📌 *Detalles del Contrato*:\n• Comercializadora: Endesa\n• Tarifa: 2.0TD\n• Estado: Pendiente Renovación\n\n👉 Accede a la ficha del cliente para gestionar la renovación: https://crm.algomasqueluz.com/clientes/0c593512-284c-43bf-b381-1c32b57c4f0d";

  console.log(`Sending POST to ${url}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        message
      })
    });

    const resBody = await response.json();
    console.log("Response status:", response.status);
    console.log("Response body:", resBody);

    if (response.ok && resBody.success) {
      console.log("✅ SUCCESS: WhatsApp test alert triggered successfully!");
    } else {
      console.error("❌ FAILED: Error triggering WhatsApp test alert.");
    }
  } catch (error) {
    console.error("❌ FAILED: Connection error:", error.message);
  }
}

test();
