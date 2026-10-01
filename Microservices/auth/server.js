require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { pool, testConnection } = require("./db/database");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const OtpServiceUrl = process.env.OTP_SERVICE_URL || "http://otp-service:3002";
const refreshTokens = new Map();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        service: "Auth",
        status: "running"
    });
});

function signAccessToken(user) {
    return jwt.sign(
        {
            sub: String(user.id),
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: "15m" }
    );
}

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const [rows] = await pool.query(
            `SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1`,
            [normalizedEmail]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = crypto.randomBytes(32).toString("hex");
        const ttl = Number(process.env.REFRESH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000);

        refreshTokens.set(refreshToken, {
            userId: user.id,
            expiresAt: Date.now() + ttl
        });

        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error("POST /auth/login failed:", error);
        return res.status(500).json({ message: "Failed to log in" });
    }
});

app.post("/auth/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token is required" });
        }

        const tokenData = refreshTokens.get(refreshToken);

        if (!tokenData) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        if (Date.now() > tokenData.expiresAt) {
            refreshTokens.delete(refreshToken);
            return res.status(401).json({ message: "Refresh token expired" });
        }

        const [rows] = await pool.query(
            `SELECT id, email FROM users WHERE id = ? LIMIT 1`,
            [tokenData.userId]
        );

        if (rows.length === 0) {
            refreshTokens.delete(refreshToken);
            return res.status(401).json({ message: "User not found" });
        }

        const user = rows[0];
        const accessToken = signAccessToken(user);

        return res.json({ accessToken });
    } catch (error) {
        console.error("POST /auth/refresh failed:", error);
        return res.status(500).json({ message: "Failed to refresh token" });
    }
});

app.post("/auth/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const [rows] = await pool.query(
            `SELECT id FROM users WHERE email = ? LIMIT 1`,
            [normalizedEmail]
        );

        if (rows.length === 0) {
            return res.status(200).json({
                message: "If an account exists, a password reset OTP has been sent."
            });
        }

        const otpResponse = await fetch(`${OtpServiceUrl}/otp/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: normalizedEmail,
                purpose: "PASSWORD_RESET"
            })
        });

        const otpData = await otpResponse.json().catch(() => ({}));

        if (!otpResponse.ok) {
            return res.status(500).json({
                message: otpData.message || "Failed to send password reset OTP"
            });
        }

        return res.status(200).json({
            message: "If an account exists, a password reset OTP has been sent.",
            ...(process.env.NODE_ENV !== "production" && otpData.otpCode ? { otpCode: otpData.otpCode } : {})
        });
    } catch (error) {
        console.error("POST /auth/forgot-password failed:", error);
        return res.status(500).json({ message: "Failed to request password reset" });
    }
});

app.post("/auth/reset-password", async (req, res) => {
    try {
        const { email, otp_code, new_password } = req.body;

        if (!email || !otp_code || !new_password) {
            return res.status(400).json({ message: "Email, OTP code, and new password are required" });
        }

        if (String(new_password).length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const verifyResponse = await fetch(`${OtpServiceUrl}/otp/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: normalizedEmail,
                otp_code,
                purpose: "PASSWORD_RESET"
            })
        });

        const verifyData = await verifyResponse.json().catch(() => ({}));

        if (!verifyResponse.ok) {
            return res.status(400).json({
                message: verifyData.message || "Invalid or expired OTP"
            });
        }

        const passwordHash = await bcrypt.hash(String(new_password), 10);
        await pool.query(
            `UPDATE users SET password_hash = ? WHERE email = ? LIMIT 1`,
            [passwordHash, normalizedEmail]
        );

        return res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("POST /auth/reset-password failed:", error);
        return res.status(500).json({ message: "Failed to reset password" });
    }
});

app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
});

app.listen(PORT, async () => {
    console.log(`Auth service running on http://localhost:${PORT}`);
    await testConnection();
});
