import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Support for Supabase or other cloud PostgreSQL providers
// If DATABASE_URL is provided, use it (Supabase provides this)
// Otherwise, use individual environment variables
let sequelize: Sequelize;

if (process.env.DATABASE_URL) {
  // Use connection string (Supabase style)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.DB_SSL !== 'false' ? {
        require: true,
        rejectUnauthorized: false // Supabase uses self-signed certificates
      } : false,
      family: 4 // Force IPv4 to avoid ENETUNREACH errors
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Use individual environment variables (backward compatible)
  const isCloudDB = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && process.env.DB_HOST !== '127.0.0.1';
  
  sequelize = new Sequelize(
    process.env.DB_NAME || 'online_auction',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        // Enable SSL for cloud databases (Supabase, AWS RDS, etc.)
        ssl: (isCloudDB || process.env.DB_SSL === 'true') ? {
          require: true,
          rejectUnauthorized: false
        } : false,
        family: 4 // Force IPv4
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

export { sequelize };

