import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Support for Supabase or other cloud PostgreSQL providers
// If DATABASE_URL is provided, use it (Supabase provides this)
// Otherwise, use individual environment variables
let sequelize: Sequelize;

if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL manually to ensure options are respected
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    
    sequelize = new Sequelize(
      dbUrl.pathname.substring(1), // database name (remove leading /)
      dbUrl.username,
      dbUrl.password,
      {
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port) || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
          ssl: process.env.DB_SSL !== 'false' ? {
            require: true,
            rejectUnauthorized: false
          } : false,
          // Force usage of IPv4 for database connection to solve ENETUNREACH errors
          family: 4, 
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );
  } catch (error) {
    console.error('Failed to parse DATABASE_URL, falling back to string connection:', error);
    // Fallback to previous method if URL parsing fails
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.DB_SSL !== 'false' ? {
          require: true,
          rejectUnauthorized: false 
        } : false,
        family: 4
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
} // else {
//   // Use individual environment variables (backward compatible)
//   const isCloudDB = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && process.env.DB_HOST !== '127.0.0.1';
  
//   sequelize = new Sequelize(
//     process.env.DB_NAME || 'online_auction',
//     process.env.DB_USER || 'postgres',
//     process.env.DB_PASSWORD || 'postgres',
//     {
//       host: process.env.DB_HOST || 'localhost',
//       port: parseInt(process.env.DB_PORT || '5432'),
//       dialect: 'postgres',
//       logging: process.env.NODE_ENV === 'development' ? console.log : false,
//       dialectOptions: {
//         // Enable SSL for cloud databases (Supabase, AWS RDS, etc.)
//         ssl: (isCloudDB || process.env.DB_SSL === 'true') ? {
//           require: true,
//           rejectUnauthorized: false
//         } : false,
//         family: 4 // Force IPv4
//       },
//       pool: {
//         max: 5,
//         min: 0,
//         acquire: 30000,
//         idle: 10000
//       }
//     }
//   );
// }

export { sequelize };

