BEGIN IMMEDIATE;
CREATE TABLE global_canvas_grants (
 viewer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 permission TEXT NOT NULL CHECK(permission IN ('read','operate'))
);
PRAGMA user_version=6;
COMMIT;
