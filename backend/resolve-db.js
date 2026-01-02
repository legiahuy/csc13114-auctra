const dns = require('dns');
const { URL } = require('url');

async function resolveDbUrl() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('');
      return;
    }

    const dbUrl = new URL(process.env.DATABASE_URL);
    const hostname = dbUrl.hostname;

    // Skip if already an IP
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      console.log(process.env.DATABASE_URL);
      return;
    }

    // Resolve IPv4
    const addresses = await dns.promises.resolve4(hostname);
    if (addresses.length > 0) {
      dbUrl.hostname = addresses[0];
      console.log(dbUrl.toString());
    } else {
      // Fallback
      console.log(process.env.DATABASE_URL);
    }
  } catch (error) {
    // If resolution fails, output original URL
    // console.error('DNS Resolution failed:', error);
    if (process.env.DATABASE_URL) {
        console.log(process.env.DATABASE_URL);
    } else {
        console.log('');
    }
  }
}

resolveDbUrl();
