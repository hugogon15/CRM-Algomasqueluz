const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize server-side Supabase client using environment variables with hardcoded fallbacks
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://vcmrrbzmyvbitnimreak.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbXJyYnpteXZiaXRuaW1yZWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTc2MjEsImV4cCI6MjA5NTM3MzYyMX0.gyXfMEYPDOLw0tcw-wUVurS6SUECcThE8PCVvQFFR0s";

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
      return;
    }

    const normEmail = email.toLowerCase().trim();
    const adminEmail = "hugo@algomasqueluz.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Hug026*HyP";

    // 1. Check Administrator Credentials (Hardcoded safeguard)
    if (normEmail === adminEmail && password === adminPassword) {
      // Find the user in database first to get their actual UUID
      const { data: dbUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', adminEmail)
        .maybeSingle();

      const user = {
        id: dbUser ? dbUser.id : "416ed828-80c0-49a1-9788-d996104e5ef3",
        email: adminEmail,
        name: dbUser ? dbUser.name : "Hugo Gon",
        role: "admin",
        phone: dbUser ? dbUser.phone : "",
        avatar_url: dbUser ? dbUser.avatar_url : "/hugo_profile.png",
        permissions: dbUser ? (dbUser.permissions || []) : ["/dashboard", "/clientes", "/pipeline", "/mapa", "/contratos", "/renovaciones", "/documentos", "/documentacion", "/mensajes", "/usuarios"]
      };

      // Generate a secure cryptographic JWT token signed with HMAC-SHA256
      const secret = process.env.JWT_SECRET || "aml-super-secret-signature-key-2026-!@#$";
      const payloadBase64 = Buffer.from(JSON.stringify(user)).toString('base64');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadBase64)
        .digest('hex');
      
      const token = `${payloadBase64}.${signature}`;

      res.status(200).json({
        success: true,
        user,
        token
      });
      return;
    }

    // 2. Query Supabase for Team Members
    const { data: dbUser, error: dbError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', normEmail)
      .maybeSingle();

    if (dbError) {
      console.error("Error querying user from database:", dbError);
    }

    if (dbUser) {
      // Validate password (supports both plain text set by admin and default Demo123! bcrypt hash)
      const isDefaultHash = dbUser.password_hash === "$2b$12$R9h/lIPsI3vqGdBf8p.7eO2Hupk2s5/6sE6c1ZzSj4VwB2N3QyS2m";
      const passwordMatches = password === dbUser.password_hash || (isDefaultHash && password === "Demo123!");

      if (passwordMatches) {
        const user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role || "comercial",
          phone: dbUser.phone || "",
          avatar_url: dbUser.avatar_url || "",
          permissions: dbUser.permissions || []
        };

        const secret = process.env.JWT_SECRET || "aml-super-secret-signature-key-2026-!@#$";
        const payloadBase64 = Buffer.from(JSON.stringify(user)).toString('base64');
        const signature = crypto
          .createHmac('sha256', secret)
          .update(payloadBase64)
          .digest('hex');
        
        const token = `${payloadBase64}.${signature}`;

        res.status(200).json({
          success: true,
          user,
          token
        });
        return;
      }
    }

    res.status(401).json({ error: 'Email o contraseña incorrectos' });
  } catch (error) {
    console.error("Error en login serverless:", error);
    res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
  }
};
