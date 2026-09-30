const http = require('http');
const fs = require('fs');
const soap = require('soap'); // never use this before
const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    database: 'test_db',
    user: 'user',
    password: 'pass123',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const mapUser = (row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    isVerified: Boolean(row.is_verified)
});

const serviceObject = {
    User_Service: {
        User_Port: {
            getHealth: async function() {
                try {
                    const connection = await dbPool.getConnection();
                    connection.release(); // never thhought i have to worried about pool exhaustion
                    return { status: "Healthy", message: "db Con" };
                } catch (ex) {
                    throw {
                        Fault: {
                            faultcode: 'Server',
                            faultstring: `db failed: ${ex.message}`
                        }
                    };
                }
            },

            getUsers: async function() {
                const [rows] = await dbPool.query("SELECT id, email, first_name, last_name, is_verified FROM users");
                return { users: { user: rows.map(mapUser) } };
            },

            getUserById: async function(args) {
                const [rows] = await dbPool.query("SELECT id, email, first_name, last_name, is_verified FROM users WHERE id = ?", [args.id]);
                if (rows.length === 0) {
                    throw { Fault: { faultcode: 'Client.NotFound', faultstring: `User with ID ${args.id} not found.` } };
                }
                return { user: mapUser(rows[0]) };
            },

            createUser: async function(args) {
                const query = "INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)";
                await dbPool.query(query, [args.email, args.passwordHash, args.firstName, args.lastName]);
                return { message: "User created!" };
            },

            updateUser: async function(args) {
                const query = "UPDATE users SET first_name = ?, last_name = ? WHERE id = ?";
                const [result] = await dbPool.query(query, [args.firstName, args.lastName, args.id]);
                
                if (result.affectedRows === 0) {
                    throw { Fault: { faultcode: 'Client.NotFound', faultstring: "User not found." } };
                }
                return { message: "User updated" };
            },

            deleteUser: async function(args) {
                const [result] = await dbPool.query("DELETE FROM users WHERE id = ?", [args.id]);
                if (result.affectedRows === 0) {
                    throw { Fault: { faultcode: 'Client.NotFound', faultstring: "User not found." } };
                }
                return { message: "User delete" };
            },

            getGames: async function() {
                const [rows] = await dbPool.query("SELECT id, title, genre, price FROM games");
                const formattedGames = rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    genre: row.genre,
                    price: row.price.toString() // XML stuff... so it's a bit different
                }));
                return { games: { game: formattedGames } };
            },

            getUserGames: async function(args) {
                const query = `
                    SELECT g.id, g.title, g.genre, g.price, ug.purchased_at 
                    FROM games g
                    INNER JOIN user_games ug ON g.id = ug.game_id
                    WHERE ug.user_id = ?`;
                
                const [rows] = await dbPool.query(query, [args.id]);
                const formattedUserGames = rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    genre: row.genre,
                    price: row.price.toString(),
                    purchasedAt: row.purchased_at ? row.purchased_at.toISOString() : null
                }));
                return { games: { game: formattedUserGames } };
            }
        }
    }
};

const wsdlXml = fs.readFileSync('service.wsdl', 'utf8');
const server = http.createServer(function(req, res) {
    res.end('404: WSDL def at /wsdl?wsdl');
});

const PORT = 8000;
server.listen(PORT, () => {
    soap.listen(server, '/wsdl', serviceObject, wsdlXml);
    console.log(`Soap at http://localhost:${PORT}/wsdl?wsdl`);
});
