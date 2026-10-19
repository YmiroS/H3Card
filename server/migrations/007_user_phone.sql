-- v6 -> v7：旧账号保留为空，登录后由本人补录手机号。
BEGIN IMMEDIATE;
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
PRAGMA user_version=7;
COMMIT;
