// Zero-Dependency Seed Script for Supabase (AlgoMásQueLuz CRM)
// Runs on Node 18+ using native fetch

const fs = require('fs');
const path = require('path');

// 1. Resolve credentials
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envPath = '/Users/hugogon15/CRM AMQL/.env.local';

if (!supabaseUrl || !supabaseAnonKey) {
  console.log(`🔍 Intentando leer credenciales desde: ${envPath}`);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);
    
    if (urlMatch) supabaseUrl = urlMatch[1].trim();
    if (keyMatch) supabaseAnonKey = keyMatch[1].trim();
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: No se encontraron las variables de entorno NEXT_PUBLIC_SUPABASE_URL ni NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('Por favor, asegúrate de tener configurado tu archivo .env.local o pásalas como variables de entorno.');
  process.exit(1);
}

console.log('✅ Supabase URL:', supabaseUrl);
console.log('🚀 Iniciando proceso de volcado de datos...');

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  try {
    // ---- LIMPIEZA DE TABLAS (Orden correcto de restricciones de FK) ----
    console.log('\n🧹 Limpiando tablas existentes...');
    
    const tablesToClean = ['notificaciones', 'documentos', 'contratos', 'clientes', 'usuarios'];
    for (const table of tablesToClean) {
      const deleteRes = await fetch(`${supabaseUrl}/rest/v1/${table}?id=not.is.null`, {
        method: 'DELETE',
        headers: headers
      });
      if (deleteRes.ok) {
        console.log(`   ✔️ Tabla [${table}] limpia.`);
      } else {
        const errText = await deleteRes.text();
        console.warn(`   ⚠️ Advertencia al limpiar la tabla [${table}]:`, errText);
      }
    }

    // ---- 1. INSERTAR USUARIOS ----
    console.log('\n👥 Insertando usuarios demo...');
    const demoUsers = [
      {
        email: 'hugo@algomasqueluz.com',
        name: 'Hugo Gon',
        role: 'admin',
        password_hash: '$2b$12$R9h/lIPsI3vqGdBf8p.7eO2Hupk2s5/6sE6c1ZzSj4VwB2N3QyS2m', // Password managed via api validation
        phone: '',
        avatar_url: ''
      },
      {
        email: 'carlos.comercial@algomasqueluz.com',
        name: 'Carlos Pérez',
        role: 'comercial',
        password_hash: '$2b$12$R9h/lIPsI3vqGdBf8p.7eO2Hupk2s5/6sE6c1ZzSj4VwB2N3QyS2m', // Demo123!
        phone: '',
        avatar_url: 'https://images.unsplash.com/photo-1713947507130-227586ab3024?crop=entropy&cs=srgb&fm=jpg&w=200&h=200&fit=crop'
      },
      {
        email: 'lucia.gestor@algomasqueluz.com',
        name: 'Lucía Martín',
        role: 'gestor',
        password_hash: '$2b$12$R9h/lIPsI3vqGdBf8p.7eO2Hupk2s5/6sE6c1ZzSj4VwB2N3QyS2m', // Demo123!
        phone: '',
        avatar_url: 'https://images.unsplash.com/photo-1576533247967-79124db83e48?crop=entropy&cs=srgb&fm=jpg&w=200&h=200&fit=crop'
      },
      {
        email: 'marta.back@algomasqueluz.com',
        name: 'Marta Ruiz',
        role: 'backoffice',
        password_hash: '$2b$12$R9h/lIPsI3vqGdBf8p.7eO2Hupk2s5/6sE6c1ZzSj4VwB2N3QyS2m', // Demo123!
        phone: '',
        avatar_url: ''
      }
    ];

    const usersRes = await fetch(`${supabaseUrl}/rest/v1/usuarios`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(demoUsers)
    });

    if (!usersRes.ok) {
      throw new Error(`Error insertando usuarios: ${await usersRes.text()}`);
    }

    const insertedUsers = await usersRes.json();
    console.log(`   ✔️ ${insertedUsers.length} usuarios creados exitosamente.`);

    // Map de email -> UUID
    const userMap = {};
    insertedUsers.forEach(u => {
      userMap[u.email] = u.id;
    });

    const carlosId = userMap['carlos.comercial@algomasqueluz.com'];
    const luciaId = userMap['lucia.gestor@algomasqueluz.com'];

    // ---- 2. INSERTAR CLIENTES ----
    console.log('\n💼 Insertando cartera de clientes...');
    
    const sampleClients = [
      { nombre: 'Panadería La Esquina', telefono: '+34 612 345 678', email: 'info@panaderialaesquina.es', cups: 'ES0021000000123456AB', provincia: 'Madrid', estado: 'cliente_activo', comercial_id: carlosId, tiene_ahorro: true, ahorro_estimado: 1240.50 },
      { nombre: 'Restaurante El Mirador', telefono: '+34 615 222 111', email: 'reservas@elmirador.com', cups: 'ES0031000000654321CD', provincia: 'Barcelona', estado: 'renovacion', comercial_id: carlosId, tiene_ahorro: true, ahorro_estimado: 3200.00 },
      { nombre: 'Taller Mecánico GarcíaHnos', telefono: '+34 617 998 776', email: 'garciahnos@gmail.com', cups: 'ES0029000000987654EF', provincia: 'Valencia', estado: 'pendiente_estudio', comercial_id: luciaId, tiene_ahorro: false, ahorro_estimado: 0.00 },
      { nombre: 'Clínica Dental SonríeMás', telefono: '+34 644 333 222', email: 'info@sonriemas.es', cups: 'ES0044000000112233GH', provincia: 'Sevilla', estado: 'enviado', comercial_id: carlosId, tiene_ahorro: true, ahorro_estimado: 2150.75 },
      { nombre: 'Hotel Vista Mar', telefono: '+34 671 444 555', email: 'direccion@vistamar.com', cups: 'ES0055000000556677IJ', provincia: 'Málaga', estado: 'nuevo_lead', comercial_id: carlosId, tiene_ahorro: false, ahorro_estimado: 0.00 },
      { nombre: 'Despacho Abogados Ruiz', telefono: '+34 691 121 314', email: 'contacto@ruizabogados.es', cups: 'ES0022000000778899KL', provincia: 'Madrid', estado: 'cliente_activo', comercial_id: luciaId, tiene_ahorro: true, ahorro_estimado: 890.20 },
      { nombre: 'Supermercados Frescolín', telefono: '+34 633 565 778', email: 'compras@frescolin.es', cups: 'ES0066000000334455MN', provincia: 'Bilbao', estado: 'renovacion', comercial_id: carlosId, tiene_ahorro: true, ahorro_estimado: 5640.00 },
      { nombre: 'Academia Idiomas Polyglot', telefono: '+34 686 909 121', email: 'info@polyglot.es', cups: 'ES0077000000667788OP', provincia: 'Zaragoza', estado: 'sin_ahorro', comercial_id: luciaId, tiene_ahorro: false, ahorro_estimado: 0.00 },
      { nombre: 'Gimnasio FitZone', telefono: '+34 612 343 545', email: 'hola@fitzone.es', cups: 'ES0088000000889900QR', provincia: 'Murcia', estado: 'pendiente_estudio', comercial_id: carlosId, tiene_ahorro: false, ahorro_estimado: 0.00 },
      { nombre: 'Floristería Las Camelias', telefono: '+34 644 767 898', email: 'pedidos@lascamelias.es', cups: 'ES0099000000990011ST', provincia: 'Alicante', estado: 'cliente_activo', comercial_id: carlosId, tiene_ahorro: true, ahorro_estimado: 420.30 },
      { nombre: 'Imprenta Rápida Gutenberg', telefono: '+34 655 121 232', email: 'info@gutenberg.es', cups: 'ES0011000000223344UV', provincia: 'Valladolid', estado: 'enviado', comercial_id: luciaId, tiene_ahorro: true, ahorro_estimado: 1875.00 },
      { nombre: 'Cafetería Aroma', telefono: '+34 666 343 454', email: 'aroma@cafe.es', cups: 'ES0033000000445566WX', provincia: 'Granada', estado: 'nuevo_lead', comercial_id: carlosId, tiene_ahorro: false, ahorro_estimado: 0.00 }
    ];

    const today = new Date();
    const clientsData = sampleClients.map((c, idx) => {
      const contactDate = new Date(today.getTime() - idx * 3 * 24 * 60 * 60 * 1000);
      const createdDate = new Date(today.getTime() - (30 + idx) * 24 * 60 * 60 * 1000);
      return {
        ...c,
        direccion: `Calle Mayor ${idx + 1}`,
        nif: `B${12345678 + idx}`,
        notas: `Semilla inicial de ${c.nombre}`,
        ultimo_contacto: contactDate.toISOString(),
        created_at: createdDate.toISOString()
      };
    });

    const clientsRes = await fetch(`${supabaseUrl}/rest/v1/clientes`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(clientsData)
    });

    if (!clientsRes.ok) {
      throw new Error(`Error insertando clientes: ${await clientsRes.text()}`);
    }

    const insertedClients = await clientsRes.json();
    console.log(`   ✔️ ${insertedClients.length} clientes creados exitosamente.`);

    // Map de nombre -> UUID del cliente
    const clientMap = {};
    insertedClients.forEach(c => {
      clientMap[c.nombre] = c.id;
    });

    // ---- 3. INSERTAR CONTRATOS ----
    console.log('\n📄 Insertando contratos asociados...');
    
    const comercializadoras = [
      'Endesa', 'Iberdrola', 'Naturgy', 'Repsol', 'TotalEnergies',
      'EDP', 'Holaluz', 'Audax', 'Acciona Energía', 'Octopus Energy'
    ];

    const contractsData = [];
    
    // Generar contratos para clientes que están activos, en renovación o con oferta enviada
    clientsData.forEach((c, idx) => {
      if (['cliente_activo', 'renovacion', 'enviado'].includes(c.estado)) {
        const clienteId = clientMap[c.nombre];
        
        // Offset de días de renovación para tener fechas en el futuro
        const offsets = [9, 25, 65, 120, 200, 320];
        const renewalOffset = offsets[idx % offsets.length];
        
        const fechaInicio = new Date(today.getTime() - (300 + idx * 5) * 24 * 60 * 60 * 1000);
        const fechaRenovacion = new Date(today.getTime() + renewalOffset * 24 * 60 * 60 * 1000);
        
        contractsData.push({
          cliente_id: clienteId,
          comercializadora: comercializadoras[idx % comercializadoras.length],
          tarifa: ['2.0TD', '3.0TD', '6.1TD'][idx % 3],
          potencia_contratada: parseFloat((5.5 + idx * 1.3).toFixed(2)),
          fecha_inicio: fechaInicio.toISOString().split('T')[0],
          fecha_renovacion: fechaRenovacion.toISOString().split('T')[0],
          permanencia_meses: 12,
          importe_anual: parseFloat((1500 + idx * 280.5).toFixed(2)),
          notas: `Contrato semilla para ${c.nombre}`,
          created_at: new Date().toISOString()
        });
      }
    });

    const contractsRes = await fetch(`${supabaseUrl}/rest/v1/contratos`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(contractsData)
    });

    if (!contractsRes.ok) {
      throw new Error(`Error insertando contratos: ${await contractsRes.text()}`);
    }

    const insertedContracts = await contractsRes.json();
    console.log(`   ✔️ ${insertedContracts.length} contratos creados y enlazados exitosamente.`);

    // ---- 4. CREAR NOTIFICACIONES DE PRUEBA ----
    console.log('\n🔔 Insertando notificaciones iniciales...');
    
    const notificationsData = [
      {
        user_id: carlosId,
        title: 'Próxima renovación',
        message: 'El contrato de Panadería La Esquina vence en 9 días.',
        read: false
      },
      {
        user_id: carlosId,
        title: 'Estudio de ahorro enviado',
        message: 'Clínica Dental SonríeMás tiene una oferta de ahorro de 2.150,75€ pendiente.',
        read: false
      },
      {
        user_id: luciaId,
        title: 'Renovación en curso',
        message: 'Taller Mecánico GarcíaHnos requiere análisis de renovación.',
        read: false
      }
    ];

    const notifRes = await fetch(`${supabaseUrl}/rest/v1/notificaciones`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(notificationsData)
    });

    if (!notifRes.ok) {
      throw new Error(`Error creando notificaciones: ${await notifRes.text()}`);
    }

    console.log('   ✔️ Notificaciones iniciales creadas.');
    console.log('\n🌟 ¡El volcado de datos de Emergent a Supabase se completó con éxito! 🎉');
    console.log('Ahora tu base de datos de Supabase está completamente poblada y lista.');

  } catch (error) {
    console.error('\n❌ Ocurrió un error inesperado durante el volcado de datos:', error.message);
    process.exit(1);
  }
}

run();
