-- SQL Queries to create tables for Cookout Invitation feature

-- Table to store cookout invitations
CREATE TABLE IF NOT EXISTS cookout_invitations (
    invitation_id SERIAL PRIMARY KEY,
    creator_username VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    cookout_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invitation_id)
);

-- Table to store participants in cookout invitations
CREATE TABLE IF NOT EXISTS cookout_participants (
    participant_id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL REFERENCES cookout_invitations(invitation_id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    confirmed_at TIMESTAMP,
    UNIQUE(invitation_id, username)
);

-- Table to store which ingredients are provided by the creator
CREATE TABLE IF NOT EXISTS cookout_creator_ingredients (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL REFERENCES cookout_invitations(invitation_id) ON DELETE CASCADE,
    ingredient_index INTEGER NOT NULL, -- 0-9 corresponding to i1-i0
    ingredient_name VARCHAR(255) NOT NULL,
    UNIQUE(invitation_id, ingredient_index)
);

-- Table to store which ingredients participants are bringing
CREATE TABLE IF NOT EXISTS cookout_participant_ingredients (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL REFERENCES cookout_invitations(invitation_id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    ingredient_index INTEGER NOT NULL, -- 0-9 corresponding to i1-i0
    ingredient_name VARCHAR(255) NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP,
    UNIQUE(invitation_id, username, ingredient_index)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cookout_invitations_creator ON cookout_invitations(creator_username);
CREATE INDEX IF NOT EXISTS idx_cookout_invitations_date ON cookout_invitations(cookout_date);
CREATE INDEX IF NOT EXISTS idx_cookout_participants_invitation ON cookout_participants(invitation_id);
CREATE INDEX IF NOT EXISTS idx_cookout_participants_username ON cookout_participants(username);
CREATE INDEX IF NOT EXISTS idx_cookout_participant_ingredients_invitation ON cookout_participant_ingredients(invitation_id);
CREATE INDEX IF NOT EXISTS idx_cookout_participant_ingredients_username ON cookout_participant_ingredients(username);

