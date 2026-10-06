async function inspect() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  
  const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  console.log("Fetching incoming phone numbers...");
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
      headers: { 'Authorization': `Basic ${authString}` }
    });
    const data = await res.json();
    console.log("Phone Numbers:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error fetching phone numbers:", e.message);
  }

  console.log("\nFetching WhatsApp Sandbox settings...");
  // Unfortunately, sandbox settings aren't directly exposed in a simple public API resource,
  // but let's check the Account details
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { 'Authorization': `Basic ${authString}` }
    });
    const data = await res.json();
    console.log("Account Details:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error fetching account details:", e.message);
  }
}

inspect();
