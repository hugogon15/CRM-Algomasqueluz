// Cloudflare D1 Database Adapter for AlgoMásQueLuz CRM

const ACCOUNT_ID = process.env.REACT_APP_CLOUDFLARE_ACCOUNT_ID || "38d9654933d2db53c6a3f741deb34abc";
const DATABASE_ID = process.env.REACT_APP_CLOUDFLARE_D1_DATABASE_ID || "74907588-a767-4552-b47c-743ba3e68c25";
const API_TOKEN = process.env.REACT_APP_CLOUDFLARE_API_TOKEN || "";

/**
 * Execute SQL Query directly against Cloudflare D1 HTTP API
 */
export async function queryD1(sql, params = []) {
  if (!API_TOKEN) {
    console.warn("Cloudflare API Token no configurado localmente. Usando modo de fallback.");
  }
  
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sql: sql,
        params: params
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Error al ejecutar consulta en Cloudflare D1");
    }

    return data.result?.[0]?.results || [];
  } catch (error) {
    console.error("Cloudflare D1 Query Error:", error);
    throw error;
  }
}

export const cloudflareConfig = {
  accountId: ACCOUNT_ID,
  databaseId: DATABASE_ID,
  isConfigured: Boolean(ACCOUNT_ID && DATABASE_ID)
};
