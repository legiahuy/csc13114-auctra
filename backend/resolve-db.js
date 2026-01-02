const dns = require('dns');
const { URL } = require('url');

async function resolveDbUrl() {
  try {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const dbUrl = new URL(process.env.DATABASE_URL);
    const hostname = dbUrl.hostname;

    // Skip if already an IP
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      console.log(process.env.DATABASE_URL);
      return;
    }

    // Try resolve4 first
    try {
      const addresses = await dns.promises.resolve4(hostname);
      if (addresses.length > 0) {
        dbUrl.hostname = addresses[0];
        console.log(dbUrl.toString());
        return;
      }
    } catch (e) {
      console.error(`dns.resolve4 failed for ${hostname}: ${e.message}`);
    }

    // Fallback to lookup (uses getaddrinfo, might work better in Alpine)
    try {
      const { address } = await dns.promises.lookup(hostname, { family: 4 });
      if (address) {
        dbUrl.hostname = address;
        console.log(dbUrl.toString());
        return;
      }
    } catch (e) {
      console.error(`dns.lookup failed for ${hostname}: ${e.message}`);
    }

    // Final fallback: return original
    console.error(`⚠️  WARNING: Could not resolve ANY IPv4 address for ${hostname}.`);
    console.error(`ℹ️  This likely means your database is IPv6-only (common with new Supabase projects).`);
    console.error(`💡 SOLUTION: Get the "Transaction Pooler" connection string (port 6543) from Supabase dashboard, which supports IPv4.`);
    console.log(process.env.DATABASE_URL);

  } catch (error) {
    console.error('Fatal error in resolve-db.js:', error);
    if (process.env.DATABASE_URL) {
        console.log(process.env.DATABASE_URL);
    }
  }
}

resolveDbUrl();
