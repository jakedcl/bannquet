/** Matches Managed Neon Auth / Better Auth with `cookiePrefix: "neon-auth"`. */
export const AUTH_COOKIE_PREFIX = '__Secure-neon-auth';
export const AUTH_SESSION_COOKIE_NAME = `${AUTH_COOKIE_PREFIX}.session_token`;
/** Stale cache cookie from Managed Neon Auth; cleared on cutover when no session token. */
export const LEGACY_SESSION_DATA_COOKIE = `${AUTH_COOKIE_PREFIX}.local.session_data`;
