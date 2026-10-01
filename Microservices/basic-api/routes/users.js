const express = require("express");
const router = express.Router();

const { pool } = require("../db/database");


// GET /api/users/:id
router.get("/:id", async (req, res) => {
    try {
        const [users] = await pool.query(
            `
            SELECT
                id,
                email,
                first_name,
                last_name,
                is_verified,
                created_at,
                updated_at
            FROM users
            WHERE id = ?
            `,
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(users[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve user"
        });
    }
});


// GET /api/users/:id/games
router.get("/:id/games", async (req, res) => {
    try {
        const [games] = await pool.query(
            `
            SELECT
                g.id,
                g.title,
                g.genre,
                g.price,
                ug.purchased_at
            FROM user_games ug
            INNER JOIN games g
                ON g.id = ug.game_id
            WHERE ug.user_id = ?
            ORDER BY ug.purchased_at DESC
            `,
            [req.params.id]
        );

        res.json(games);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve user's games"
        });
    }
});


module.exports = router;