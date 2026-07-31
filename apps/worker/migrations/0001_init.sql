CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  auth_provider TEXT,
  password_hash TEXT,
  created_at INTEGER
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  white_user_id TEXT REFERENCES users(id),
  black_user_id TEXT REFERENCES users(id),
  white_display_name TEXT,
  black_display_name TEXT,
  result TEXT,
  result_reason TEXT,
  move_log TEXT,
  started_at INTEGER,
  ended_at INTEGER
);
