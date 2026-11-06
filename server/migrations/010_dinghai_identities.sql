BEGIN IMMEDIATE;
CREATE TABLE external_identities (
 issuer TEXT NOT NULL,
 subject TEXT NOT NULL,
 user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
 created_at REAL NOT NULL,
 PRIMARY KEY(issuer, subject)
);
CREATE TABLE dinghai_binding_challenges (
 token_hash TEXT PRIMARY KEY,
 csrf_token TEXT NOT NULL,
 issuer TEXT NOT NULL,
 subject TEXT NOT NULL,
 expires_at REAL NOT NULL,
 created_at REAL NOT NULL
);
CREATE INDEX dinghai_binding_expiry ON dinghai_binding_challenges(expires_at);
PRAGMA user_version=10;
COMMIT;
