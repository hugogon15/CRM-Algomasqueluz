async function testDirect() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  
  // Test 1: Using the user's provided From number
  // Let's test with and without whatsapp: prefix, and check other variations
  const testSenders = [
    "whatsapp:+18562809617",
    "whatsapp:+14155238886",
    "+18562809617"
  ];
  
  const to = "whatsapp:+34688431671";
  const message = "Twilio Direct Test Alert";

  const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  for (const from of testSenders) {
    console.log(`\n--- Testing Sender: ${from} ---`);
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: message
        })
      });

      const data = await response.json();
      console.log("Status:", response.status);
      console.log("Data:", JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("Error:", e.message);
    }
  }
}

testDirect();
