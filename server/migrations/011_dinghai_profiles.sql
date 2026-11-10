BEGIN IMMEDIATE;
ALTER TABLE external_identities ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}';
PRAGMA user_version=11;
COMMIT;
