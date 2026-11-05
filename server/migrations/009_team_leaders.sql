-- v8 -> v9：组内多人组长，保留原始负责人及成员归属
BEGIN IMMEDIATE;
ALTER TABLE team_members ADD COLUMN is_leader INTEGER NOT NULL DEFAULT 0 CHECK(is_leader IN (0,1));
UPDATE team_members SET is_leader=1
WHERE EXISTS (
 SELECT 1 FROM teams t WHERE t.id=team_members.team_id AND t.leader_id=team_members.user_id
);
PRAGMA user_version=9;
COMMIT;
