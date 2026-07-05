PROJECT_REF := hgrgcppgdtqlgpxlwyug

# ─── First-time setup ────────────────────────────────────────────────────────
# Run once to link this repo to the live Supabase project.
# Requires: supabase login  (or SUPABASE_ACCESS_TOKEN env var set to a PAT)
link:
	supabase link --project-ref $(PROJECT_REF)

# ─── Daily workflow ───────────────────────────────────────────────────────────

# Create a new empty migration file.
# Usage: make migration name=add_payment_status
migration:
	@test -n "$(name)" || (echo "Usage: make migration name=<migration_name>" && exit 1)
	supabase migration new $(name)

# Push all pending local migrations to the live Supabase database.
deploy:
	supabase db push

# Show which migrations have been applied vs pending.
status:
	supabase migration list

# ─── Safety / inspection ─────────────────────────────────────────────────────

# Show what SQL would be pushed (dry run — does not apply anything).
diff:
	supabase db diff

# Pull schema changes made in the Supabase console into a new migration file.
# Use this if someone makes a change in the console and you need to capture it.
pull:
	supabase db pull --schema public

.PHONY: link migration deploy status diff pull
