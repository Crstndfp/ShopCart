import dotenv from 'dotenv';
import sql from 'mssql';

    dotenv.config();                                                                                                                                                                                 
                                                                                                                                                                                                     
    const dbConfig: sql.config = {                                                                                                                                                                   
      server: process.env.DB_SERVER || 'localhost',                                                                                                                                                  
      port: parseInt(process.env.DB_PORT || '1433', 10),                                                                                                                                             
      database: process.env.DB_NAME || 'ShopCartDB',                                                                                                                                                 
      user: process.env.DB_USER || 'sa',                                                                                                                                                             
      password: process.env.DB_PASSWORD || 'PentandraShopCart2026!',                                                                                                                                 
      options: {                                                                                                                                                                                     
        encrypt: process.env.DB_ENCRYPT === 'true', // true para Azure, false para Docker local                                                                                                      
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',                                                                                                                 
      },                                                                                                                                                                                             
      pool: {                                                                                                                                                                                        
        min: 5,                                                                                                                                                                                      
        max: 25,                                                                                                                                                                                     
        idleTimeoutMillis: 30000,                                                                                                                                                                    
      },                                                                                                                                                                                             
    };                                                                                                                                                                                               
                                                                                                                                                                                                     
    let pool: sql.ConnectionPool | null = null;                                                                                                                                                      
                                                                                                                                                                                                     
    export async function getDbPool(): Promise<sql.ConnectionPool> {                                                                                                                                 
      if (!pool) {                                                                                                                                                                                   
        pool = await new sql.ConnectionPool(dbConfig).connect();                                                                                                                                     
        console.log(' Connected to SQL Server (ShopCartDB)');                                                                                                                                        
      }                                                                                                                                                                                              
      return pool;                                                                                                                                                                                   
    }