-- v7 -> v8：由 AuthStore 在事务外关闭外键，在事务内复制原 users DDL 并扩展角色 CHECK。
-- 不先重命名旧表，避免子表的外键目标被改写；原列及约束由原 DDL 完整保留。
-- 索引和触发器在重建后恢复，foreign_key_check 通过才提交，任何失败均回滚并恢复外键。
INSERT INTO users_monitor_v8 SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_monitor_v8 RENAME TO users;
PRAGMA user_version=8;
