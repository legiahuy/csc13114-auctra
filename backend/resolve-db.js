const dns = require('dns');
const { URL } = require('url');

// Helper to resolve specific hostname
async function resolveHostname(hostname) {
  try {
    // Skip if already an IP
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname;
    }

    // Try resolve4 first
    try {
      const addresses = await dns.promises.resolve4(hostname);
      if (addresses.length > 0) return addresses[0];
    } catch (e) {
      // console.error(`dns.resolve4 failed for ${hostname}: ${e.message}`);
    }

    // Fallback to lookup
    try {
      const { address } = await dns.promises.lookup(hostname, { family: 4 });
      if (address) return address;
    } catch (e) {
      // console.error(`dns.lookup failed for ${hostname}: ${e.message}`);
    }
  } catch (error) {
    console.error(`Resolution error: ${error.message}`);
  }
  return null;
}

async function main() {
  const mode = process.argv[2]; // 'database' or 'email'

  if (mode === 'email') {
    if (!process.env.EMAIL_HOST) return;
    const ip = await resolveHostname(process.env.EMAIL_HOST);
    if (ip) console.log(ip);
    else console.log(process.env.EMAIL_HOST);
    return;
  }

  // Default: Database
  try {
    if (!process.env.DATABASE_URL) return;

    const dbUrl = new URL(process.env.DATABASE_URL);
    const ip = await resolveHostname(dbUrl.hostname);

    if (ip) {
      dbUrl.hostname = ip;
      console.log(dbUrl.toString());
    } else {
        console.error(`⚠️  WARNING: Could not resolve ANY IPv4 address for ${dbUrl.hostname}.`);
        console.error(`ℹ️  This likely means your database is IPv6-only (common with new Supabase projects).`);
        console.error(`💡 SOLUTION: Get the "Transaction Pooler" connection string (port 6543) from Supabase dashboard, which supports IPv4.`);
        console.log(process.env.DATABASE_URL);
    }
  } catch (error) {
    if (process.env.DATABASE_URL) console.log(process.env.DATABASE_URL);
  }
}

main();
