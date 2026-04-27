-- Prisma Migrate creates a transient shadow database (e.g. `prisma_migrate_shadow_db_*`)
-- to diff schema state. The default app user only owns its own schema, so the shadow
-- create fails with P1010 unless we grant it broader privileges. Local dev only.
GRANT ALL PRIVILEGES ON *.* TO 'sunday_funday'@'%';
FLUSH PRIVILEGES;
