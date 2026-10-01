const express = require("express");
const router = express.Router();

const { pool } = require("../db/database");

router.get("/", async (req, res) => {
    try {
        const { search } = req.query;
        const params = [];
        let sql = "SELECT id, title, genre, price FROM games";

        if (search) {
            sql += " WHERE title LIKE ?";
            params.push(`%${search}%`);
        }

        sql += " ORDER BY title ASC";

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error("GET /api/games failed:", error);
        res.status(500).json({ message: "Failed to retrieve games" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, title, genre, price FROM games WHERE id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Game not found" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("GET /api/games/:id failed:", error);
        res.status(500).json({ message: "Failed to retrieve game" });
    }
});

module.exports = router;