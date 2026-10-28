# Environments, databases and testing

Bannquet has two live environments. Each one talks to its own Neon database.

| | Production | Preview |
|---|---|---|
| Site | www.bannquet.com (Vercel production, builds from `main`) | `bannquet-git-<branch>-jakedcl.vercel.app` (Vercel preview, every non-main push / PR) |
| Neon branch | `main` (`br-icy-waterfall-b7djctpq`) | `preview` (`br-curly-snow-b73nm5ro`) |
| Neon Auth | main's own | preview's own (separate member accounts) |
| Vercel env vars | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` scoped to **production + development** | the same four keys scoped to **preview only**, pointing at the `preview` branch |

Neon project: `hidden-cherry-64820503`. All PR previews share the one `preview` branch.

## What is still shared with live
- **Vercel Blob** (photos): a photo uploaded on a preview is stored with the real photos. Delete test uploads.
- Everything else in Vercel env vars (`ADMIN_EMAIL`, USGS key, cookie secret) is the same in both.

## Data vs structure
- **Data never moves from preview to main.** Merging a PR carries code only.
- **Structure (tables, columns) is changed by migrations**, which live in `drizzle/` as SQL files and merge with the code. Each database has to have each migration run on it separately.

## Migrations (IMPORTANT)
- Migrations from `0010` on were applied **by hand**. `drizzle.__drizzle_migrations` only records 10 rows, so `npm run db:migrate` / `drizzle-kit migrate` would try to replay 0010+ and fail. **Never run `db:migrate` against `main`.**
- Workflow for a PR that changes the schema:
  1. `npm run db:generate` to create the SQL file. Edit it so every statement is safe to re-run (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
  2. Apply that SQL by hand to the `preview` branch, then test on the PR preview.
  3. At merge time, apply the same SQL by hand to `main` **before** merging, so production never runs code that expects a missing column.
- Cloud agents: write the migration file, but don't apply it to any database. Say in the PR exactly which SQL needs applying. Jake's assistant applies it.

## Preview sign-in
- Neon Auth only accepts sign-ins from trusted domains. Each new PR preview host (`bannquet-git-<branch>-jakedcl.vercel.app`) must be added to the **preview** branch's Neon Auth trusted domains, or sign-in on that preview is refused.
- Preview URLs are behind Vercel login, so curl gets a 302. Test them in a signed-in browser.

## Standing test account
- Username `bqtester`, email `jake+bqtest@dcldev.com`, role `member`, approved. It exists **only on the `preview` branch**, never on `main`.
- Reuse it for every feature test instead of making and deleting accounts. The password is never committed. Jake's assistant keeps it on its own machine.
- Delete any test posts, routes, photos or `sign_in_attempts` rows after testing. Keep the account.

## Resetting the preview branch
- Don't reset after every merge. The preview only needs realistic data, not the latest data.
- Reset `preview` from `main` (Neon "reset from parent") only when:
  - a rejected PR left a table or column behind that `main` doesn't have, or
  - a feature needs recent real data.
- A reset wipes everything on `preview`, including the test account. After a reset:
  1. Recreate `bqtester` by signing up on a preview, then approve it on the preview `/admin` page (or set `role = 'member'` on the preview branch only).
  2. Re-check the trusted domains for the open preview.

## Never
- Never point a preview at `main`, and never create test accounts on `main`.
- Never run `db:migrate` on `main`.
