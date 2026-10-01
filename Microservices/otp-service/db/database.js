const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "microservices_demo",
    user: process.env.DB_USER || "demo_user",
    password: process.env.DB_PASSWORD || "Demo123!",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("OTP service connected to MySQL");
        connection.release();
    } catch (error) {
        console.error("OTP database failed:", error.message);
    }
}

module.exports = {
    pool,
    testConnection
};