-- v2 -> v3：组长权限、项目组成员与项目组画布
BEGIN IMMEDIATE;
ALTER TABLE users ADD COLUMN team_leader INTEGER NOT NULL DEFAULT 0 CHECK(team_leader IN (0,1));
CREATE TABLE teams (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 leader_id TEXT NOT NULL REFERENCES users(id),
 state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','deleted')),
 created_at REAL NOT NULL,
 updated_at REAL NOT NULL
);
CREATE INDEX teams_leader ON teams(leader_id,state);
CREATE TABLE team_members (
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id),
 joined_at REAL NOT NULL,
 PRIMARY KEY(team_id,user_id)
);
CREATE INDEX team_members_user ON team_members(user_id,team_id);
ALTER TABLE project_acl ADD COLUMN team_id TEXT REFERENCES teams(id);
CREATE INDEX project_acl_team ON project_acl(team_id,state);
PRAGMA user_version=3;
COMMIT;
