CREATE DATABASE socialmedia_chat_db;
CREATE TYPE user_role AS ENUM ('admin', 'standard');

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    birthdate DATE NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'standard'
        CHECK (role IN ('admin', 'standard')),
    created_by_admin BOOLEAN DEFAULT FALSE,
    allowed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_role ON accounts(role);
CREATE INDEX idx_accounts_allowed ON accounts(allowed);

ALTER TABLE accounts
ADD CONSTRAINT email_format_chk
CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$');

CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_messages_created_at
    ON chat_messages (created_at DESC);

CREATE INDEX idx_chat_messages_sender
    ON chat_messages (sender_id);

CREATE TABLE chat_rooms (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    is_private BOOLEAN DEFAULT false
);

CREATE TABLE chat_room_members (
    room_id BIGINT REFERENCES chat_rooms(id),
    user_id INTEGER REFERENCES accounts(id),
    PRIMARY KEY (room_id, user_id)
);

ALTER TABLE chat_messages
ADD COLUMN room_id BIGINT REFERENCES chat_rooms(id);
