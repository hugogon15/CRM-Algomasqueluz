const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/Users/hugogon15/CRM AMQL/frontend/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.REACT_APP_SUPABASE_URL;
const supabaseKey = env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing various states to see which ones are allowed by the DB constraint:");
  const testStates = [
    'nuevo_lead', 'pendiente_estudio', 'sin_ahorro', 'incompleto', 'enviado_firma', 
    'incidencia', 'pendiente_activacion', 'cliente_activo', 'renovacion', 'no_renovado', 'baja'
  ];
  
  // Create dummy client
  const { data: client, error: cErr } = await supabase
    .from('clientes')
    .insert({ nombre: "Test State Check Active", estado: "nuevo_lead" })
    .select().single();
    
  if (cErr) {
    console.error("Create failed:", cErr);
    return;
  }
  
  console.log(`Created test client with ID: ${client.id}`);
  
  for (const s of testStates) {
    const { error: uErr } = await supabase
      .from('clientes')
      .update({ estado: s })
      .eq('id', client.id);
      
    if (uErr) {
      console.log(`❌ State '${s}' is NOT allowed: ${uErr.message}`);
    } else {
      console.log(`✅ State '${s}' IS allowed!`);
    }
  }
  
  // Cleanup
  const { error: dErr } = await supabase.from('clientes').delete().eq('id', client.id);
  if (dErr) {
    console.error("Cleanup failed:", dErr.message);
  } else {
    console.log("Cleanup successful.");
  }
}

run();
