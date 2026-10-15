/**
 * Sanity trip reports were copied into trips. The trip_reports table is gone,
 * so this import no longer writes anything.
 */
console.error('trip_reports was removed. This import no longer runs.');
process.exit(1);
