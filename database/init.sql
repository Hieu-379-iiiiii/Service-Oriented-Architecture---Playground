CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP + AUTO-STORAGE MANAGEMENT

CREATE TABLE IF NOT EXISTS email_otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'LOGIN_MFA') DEFAULT 'REGISTRATION',
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_otp_lookup ON email_otps (user_id, otp_code, is_used);
CREATE INDEX idx_otp_expiry ON email_otps (expires_at);

-- AUTOMATION CRON: Deletes used or dead OTP
CREATE EVENT IF NOT EXISTS purge_expired_otps
ON SCHEDULE EVERY 10 MINUTE
DO
  DELETE FROM email_otps 
  WHERE expires_at < NOW() OR is_used = TRUE;

CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL UNIQUE,
    genre VARCHAR(50),
    price DECIMAL(6,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS user_games (
    user_id INT NOT NULL,
    game_id INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,          -- 1-n
    ticket_subject VARCHAR(150) NOT NULL,
    ticket_status ENUM('OPEN', 'PENDING', 'CLOSED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- seeding
INSERT INTO users (email, password_hash, first_name, last_name, is_verified) VALUES 
('verified_user@example.com', '$2b$10$ExMPlE', 'John', 'Doe', TRUE),
('unverified_user@example.com', '$2b$10$ExMPlE', 'Jane', 'Smith', FALSE);

INSERT INTO games (title, genre, price) VALUES 
('Cyberpunk 2077', 'RPG', 59.99),
('Elden Ring', 'Action RPG', 59.99),
('Hades', 'Rogue-like', 24.99);

INSERT INTO user_games (user_id, game_id) VALUES (1, 1), (1, 3), (2, 3);

INSERT INTO support_tickets (user_id, ticket_subject, ticket_status) VALUES 
(1, 'Cannot launch Cyberpunk on my system', 'OPEN'),
(1, 'Billing query regarding Hades invoice', 'CLOSED');

INSERT INTO email_otps (user_id, otp_code, purpose, is_used, expires_at) VALUES 
(2, '123456', 'REGISTRATION', FALSE, '2030-01-01 00:00:00');
