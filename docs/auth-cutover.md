# Self-hosted Better Auth cutover

Bannquet auth runs in the Next.js app against the existing `neon_auth` schema in Postgres. No member rows, passwords, or app data are copied or rewritten.

## Vercel environment (preview first, then production)

Set on **preview** and **development** (and on **production** only at cutover):

| Variable | Notes |
|---|---|
| `BETTER_AUTH_SECRET` | Same value as the branch's former `NEON_AUTH_COOKIE_SECRET` so existing `__Secure-neon-auth.*` session cookies stay valid. |
| `BETTER_AUTH_URL` | Preview: `https://bannquet-git-<branch>-dcldev.vercel.app`. Local: `http://localhost:3000`. Production: `https://www.bannquet.com`. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Optional. Comma-separated preview hosts if sign-in is refused for origin. Localhost is always allowed for dev. |

Remove when self-hosted is live on that environment (not before Jake confirms sign-in):

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_JWKS_URL`

Keep `DATABASE_URL` / `DATABASE_URL_UNPOOLED` unchanged. `BETTER_AUTH_SECRET` can temporarily fall back to `NEON_AUTH_COOKIE_SECRET` if only the legacy name is set.

## Database

No new migration is required for self-hosted auth: Managed Neon Auth already created `neon_auth` (`user`, `session`, `account`, `verification`, …).

## Tear down Managed Neon Auth (stops the schema-poller)

Do this **per branch** only after sign-in works with self-hosted on that environment. A soft disable is **not** enough; the introspection loop must stop.

1. In the Neon console for project `hidden-cherry-64820503`, open the branch (`preview` first, then `main` after production cutover).
2. Disable the **Managed Auth hosted service** with **`--delete-data=false`** (or the console equivalent) so the `neon_auth` member tables stay put. Example:  
   `neon neon-auth disable --project-id hidden-cherry-64820503 --branch <branch> --delete-data=false`  
   Never use `--delete-data=true` on production or preview while self-hosted auth uses `neon_auth.user` / `account` / `session`. That flag drops the schema and would lock everyone out.
3. If Neon still runs the schema-introspection poller after a soft disable, complete the hard Managed Auth removal steps in [Neon’s manage-auth API docs](https://neon.com/docs/auth/guides/manage-auth-api) **without** deleting member auth tables.
4. Confirm compute idle time drops in Neon (no 24/7 auth introspection).

Preview cutover: complete steps 1–2 on branch `preview` (`br-curly-snow-b73nm5ro`) while testing the PR.

Production cutover: repeat only **after** merge and Jake confirms live sign-in on www.bannquet.com. Never tear down production Managed Auth in the PR preview phase.

## Session continuity

- Existing **passwords** stay in `neon_auth.account`; hashes are unchanged.
- Existing **sessions** should survive when `BETTER_AUTH_SECRET` matches the old cookie secret and cookie prefix stays `neon-auth` (cookies `__Secure-neon-auth.session_token`). Users may get a new session cache cookie; they should not need to sign in again.
- If anything forces a one-time re-login (e.g. secret mismatch), say so in the release note; do not change passwords or accounts.

## Order of operations (production)

1. Merge the self-hosted auth PR.
2. Set production `BETTER_AUTH_*` vars; remove `NEON_AUTH_BASE_URL` / `NEON_AUTH_JWKS_URL`.
3. Redeploy production; Jake signs in with an existing member account.
4. Hard-disable Managed Neon Auth on `main` so compute stops idling.
5. Add new PR preview hosts to `BETTER_AUTH_TRUSTED_ORIGINS` when needed (no Neon Auth trusted-domain UI).
