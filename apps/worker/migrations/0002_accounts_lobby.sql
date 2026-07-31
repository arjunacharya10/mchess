ALTER TABLE users ADD COLUMN provider_user_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN rating INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE users ADD COLUMN current_game_id TEXT;
ALTER TABLE users DROP COLUMN password_hash;

CREATE UNIQUE INDEX idx_users_provider_user_id ON users(provider_user_id);

CREATE TABLE public_games (
  game_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  white_display_name TEXT,
  black_display_name TEXT,
  white_user_id TEXT,
  black_user_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_public_games_status ON public_games(status);
