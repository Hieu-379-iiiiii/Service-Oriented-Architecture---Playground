const express = require("express");
const router = express.Router();

const { pool } = require("../db/database");

router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT id, user_id, ticket_subject, ticket_status, created_at
            FROM support_tickets
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error("GET /api/tickets failed:", error);
        res.status(500).json({ message: "Failed to retrieve tickets" });
    }
});

router.post("/", async (req, res) => {
    try {
        const { ticket_subject } = req.body;

        if (!ticket_subject || !ticket_subject.trim()) {
            return res.status(400).json({ message: "ticket_subject is required" });
        }

        const [result] = await pool.query(
            `
            INSERT INTO support_tickets (user_id, ticket_subject)
            VALUES (?, ?)
            `,
            [req.user.id, ticket_subject.trim()]
        );

        res.status(201).json({
            message: "Support ticket created",
            id: result.insertId
        });
    } catch (error) {
        console.error("POST /api/tickets failed:", error);
        res.status(500).json({ message: "Failed to create ticket" });
    }
});

module.exports = router;