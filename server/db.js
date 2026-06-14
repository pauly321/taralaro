import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';

let pool;

export const getDb = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectionLimit: dbConfig.connectionLimit,
      waitForConnections: true,
    });
  }

  return pool;
};
