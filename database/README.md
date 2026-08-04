# Database

**`schema.sql`** is the single source of truth for the full Supabase schema — 49 tables, all RLS policies, and all indexes, reflecting the final state after merging migrations 01 through 89. Run it top-to-bottom in the Supabase SQL Editor to stand up a brand-new project (fresh demo/test project, disaster recovery, etc.). It is idempotent — safe to run again on a project that already has some or all of this.

**`migrations_archive/`** holds the original 91 incremental migration files (01–89, plus `diagnose_schema.sql` and the old `fix_schema_sync.sql`) for historical reference only. They are not needed to set up a new project — `schema.sql` supersedes them. Kept so you can see exactly when and why a column was added (each file has a comment explaining the change).

## Workflow going forward

There's no migration-tracking table or runner in this project — schema changes are still applied by hand in the Supabase SQL Editor, once per project (live and demo). For a new schema change:

1. Add the `CREATE TABLE` / `ALTER TABLE` statements directly to the relevant section of `schema.sql` (keep it as the always-current picture of the schema).
2. Run just that new statement against the live and demo Supabase projects (Dashboard → SQL Editor).

## Known gap at time of writing (2026-08-04)

Migrations 85, 86, 88, and 89 (budget rollover, subscription last-paid-amount tracking, health insurance room-rent limit, SIP status/step-up) were added the same day this consolidation happened and may not yet be applied to the live or demo Supabase projects. `schema.sql` includes them — running it against either project will safely add whatever is still missing without touching existing data.
