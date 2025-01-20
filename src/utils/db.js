
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


// const testDbConnection = async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('Database connected successfully');
//     connection.release(); // Release connection back to the pool
//   } catch (error) {
//     console.error('Error connecting to the database:', error);
//     process.exit(1); // Exit if database connection fails
//   }
// };

// // Test the connection when the server starts
// testDbConnection();


module.exports = pool;