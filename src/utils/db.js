const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  // Use the public hostname provided by OVH Cloud Database:
  host: process.env.DB_HOST || 'mysql-a9d864db-o54dcd2b9.database.cloud.ovh.net',
  // Use the port from the connection string (20184):
  port: process.env.DB_PORT || 20184,
  // Your credentials (set these in your .env file):
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  // Database name as provided ('defaultdb'):
  database: process.env.DB_NAME || 'Avoyes',
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: 0,
  connectTimeout: process.env.DB_CONNECT_TIMEOUT || 10000, // 10 seconds timeout
  // Enforce SSL as required by OVH Cloud Database:
  ssl: { rejectUnauthorized: false }
});

// Optional: Test the connection when the server starts
const testDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

testDbConnection();

module.exports = pool;
