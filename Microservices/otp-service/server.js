require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const { pool, testConnection } = require("./db/database");

const app = express();
const PORT = Number(process.env.PORT || 3002);

const mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mailhog",
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    ignoreTLS: true
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        service: "OTP Service",
        status: "running"
    });
});

app.post("/otp/send", async (req, res) => {
    try {
        const { email, purpose = "PASSWORD_RESET" } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const [userRows] = await pool.query(
            `SELECT id, email FROM users WHERE email = ? LIMIT 1`,
            [normalizedEmail]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const otpCode = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            `
            INSERT INTO email_otps (user_id, otp_code, purpose, is_used, expires_at)
            VALUES (?, ?, ?, FALSE, ?)
            `,
            [userRows[0].id, otpCode, purpose, expiresAt]
        );

        await mailTransport.sendMail({
            from: process.env.SMTP_FROM || "demo@local.test",
            to: normalizedEmail,
            subject: "Your demo OTP code",
            text: `Your OTP code is ${otpCode}. It expires in 5 minutes.`
        });

        return res.json({
            message: "OTP sent",
            otpCode
        });
    } catch (error) {
        console.error("POST /otp/send failed:", error);
        return res.status(500).json({ message: "Failed to send OTP" });
    }
});

app.post("/otp/verify", async (req, res) => {
    try {
        const { email, otp_code, purpose = "PASSWORD_RESET" } = req.body;

        if (!email || !otp_code) {
            return res.status(400).json({ message: "Email and OTP code are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const [userRows] = await pool.query(
            `SELECT id FROM users WHERE email = ? LIMIT 1`,
            [normalizedEmail]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const [otpRows] = await pool.query(
            `
            SELECT id, otp_code, expires_at, is_used
            FROM email_otps
            WHERE user_id = ?
              AND otp_code = ?
              AND purpose = ?
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [userRows[0].id, String(otp_code), purpose]
        );

        if (otpRows.length === 0) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const otp = otpRows[0];

        if (otp.is_used) {
            return res.status(400).json({ message: "OTP has already been used" });
        }

        if (new Date(otp.expires_at) < new Date()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        await pool.query(
            `UPDATE email_otps SET is_used = TRUE WHERE id = ?`,
            [otp.id]
        );

        return res.json({
            valid: true,
            message: "OTP verified"
        });
    } catch (error) {
        console.error("POST /otp/verify failed:", error);
        return res.status(500).json({ message: "Failed to verify OTP" });
    }
});

app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
});

app.listen(PORT, async () => {
    console.log(`OTP service running on http://localhost:${PORT}`);
    await testConnection();
});
