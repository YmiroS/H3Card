-- v1 -> v2：用户自主注册与钉钉审批
-- 旧账号全部视为已批准；enabled 语义保持“管理员启停用”不变。
BEGIN IMMEDIATE;
ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved';
UPDATE users SET display_name=username WHERE display_name='';
CREATE TABLE registration_requests (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 username TEXT NOT NULL,
 display_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at REAL NOT NULL,
 decided_at REAL,
 decided_by TEXT,
 corp_id TEXT,
 out_track_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX registration_requests_user ON registration_requests(user_id);
CREATE INDEX registration_requests_track ON registration_requests(out_track_id);
CREATE TABLE notification_outbox (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_id TEXT NOT NULL REFERENCES registration_requests(id),
 kind TEXT NOT NULL CHECK(kind IN ('send_card','update_card')),
 dedupe_key TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_try_at REAL NOT NULL,
 leased_until REAL NOT NULL DEFAULT 0,
 created_at REAL NOT NULL,
 last_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX notification_outbox_due ON notification_outbox(status, next_try_at);
PRAGMA user_version=2;
COMMIT;
