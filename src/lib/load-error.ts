/**
 * Pages show this instead of the raw error. Database errors include the full
 * SQL and its parameters, which visitors should never see. The details go to
 * the server log.
 */
export function loadFailed(where: string, error: unknown, message = 'This did not load. Try again in a minute.'): string {
  console.error(`[load] ${where} failed`, error);
  return message;
}
