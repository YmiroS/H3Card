-- v4 -> v5：同一画布为每位用户保存独立视图
BEGIN IMMEDIATE;
CREATE TABLE project_user_views (
 project_id TEXT NOT NULL REFERENCES project_acl(project_id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 x REAL NOT NULL,
 y REAL NOT NULL,
 k REAL NOT NULL,
 updated_at REAL NOT NULL,
 PRIMARY KEY(project_id,user_id)
);
CREATE INDEX project_user_views_user ON project_user_views(user_id,project_id);
PRAGMA user_version=5;
COMMIT;
