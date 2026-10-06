const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = '/Users/hugogon15/CRM AMQL/frontend/.env.local';
const backupEnvPath = '/Users/hugogon15/CRM AMQL/.env.local';

let env = {};
const parseEnv = (filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
};

parseEnv(envPath);
parseEnv(backupEnvPath);

// Also look at other variables
const supabaseUrl = env.REACT_APP_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.REACT_APP_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key not found in env", env);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error fetching documents:", error);
  } else if (data && data.length > 0) {
    console.log("Columns present in 'documentos' table:", Object.keys(data[0]));
    console.log("Sample record:", data[0]);
  } else {
    console.log("No documents records found, but we connected successfully.");
  }
}

run();
