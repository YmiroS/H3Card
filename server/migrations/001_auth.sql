BEGIN IMMEDIATE;
CREATE TABLE users (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL,
 username_key TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','user')),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 version INTEGER NOT NULL DEFAULT 0, created_at REAL NOT NULL
);
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf_token TEXT NOT NULL, expires_at REAL NOT NULL, created_at REAL NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE user_grants (
 viewer_id TEXT NOT NULL REFERENCES users(id), owner_id TEXT NOT NULL REFERENCES users(id),
 permission TEXT NOT NULL CHECK(permission IN ('read','operate')),
 PRIMARY KEY(viewer_id,owner_id), CHECK(viewer_id != owner_id)
);
CREATE TABLE project_acl (
 project_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
 state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('pending','active','deleted')),
 created_at REAL NOT NULL
);
CREATE TABLE job_acl (
 job_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project_acl(project_id),
 user_id TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX job_acl_project ON job_acl(project_id);
CREATE TABLE auth_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO auth_meta VALUES ('ready','0');
PRAGMA user_version=1;
COMMIT;
