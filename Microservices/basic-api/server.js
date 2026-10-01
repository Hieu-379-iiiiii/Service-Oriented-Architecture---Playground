require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { pool, testConnection } = require("./db/database");
const authMiddleware = require("./middleware/auth");
const gamesRoutes = require("./routes/games");
const ticketsRoutes = require("./routes/tickets");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        service: "Basic API",
        status: "running"
    });
});

app.use("/api/games", gamesRoutes);

app.get("/api/me", authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT id, email, first_name, last_name, is_verified, created_at, updated_at
            FROM users
            WHERE id = ?
            `,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("GET /api/me failed:", error);
        res.status(500).json({ message: "Failed to load user profile" });
    }
});

app.get("/api/me/games", authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT g.id, g.title, g.genre, g.price
            FROM user_games ug
            INNER JOIN games g ON g.id = ug.game_id
            WHERE ug.user_id = ?
            ORDER BY g.title ASC
            `,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error("GET /api/me/games failed:", error);
        res.status(500).json({ message: "Failed to load owned games" });
    }
});

app.use("/api/tickets", authMiddleware, ticketsRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
});

app.listen(PORT, async () => {
    console.log(`Basic API running on http://localhost:${PORT}`);
    await testConnection();
});