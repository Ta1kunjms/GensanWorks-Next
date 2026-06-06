const dns = require("dns").promises;

async function main() {
  const host = "tsvioxrlmcsqdricdgkd.supabase.co";
  try {
    const addresses = await dns.resolve4(host);
    console.log(`Addresses for ${host}:`, addresses);
    
    // Also resolve CNAME if any
    try {
      const cname = await dns.resolveCname(host);
      console.log(`CNAME for ${host}:`, cname);
    } catch (e) {
      console.log("No CNAME found or error:", e.message);
    }
  } catch (err) {
    console.error("DNS Resolution Error:", err.message);
  }
}

main();
