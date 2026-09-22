-- v3 -> v4：个人画布按画布分享给用户或项目组
BEGIN IMMEDIATE;
CREATE TABLE project_user_shares (
 project_id TEXT NOT NULL REFERENCES project_acl(project_id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at REAL NOT NULL,
 PRIMARY KEY(project_id,user_id)
);
CREATE INDEX project_user_shares_user ON project_user_shares(user_id,project_id);
CREATE TABLE project_team_shares (
 project_id TEXT NOT NULL REFERENCES project_acl(project_id) ON DELETE CASCADE,
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
 created_at REAL NOT NULL,
 PRIMARY KEY(project_id,team_id)
);
CREATE INDEX project_team_shares_team ON project_team_shares(team_id,project_id);
PRAGMA user_version=4;
COMMIT;
