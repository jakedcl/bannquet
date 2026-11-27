/**
 * Auto-link photos to routes (same owner, time window, 200 m).
 *
 * Dry run:  npx tsx scripts/link-photo-routes.ts
 * Apply:    npx tsx scripts/link-photo-routes.ts --write
 */
import { autoLinkAllPhotoRoutes, countAutoLinkCandidates } from '@/lib/photo-route-links';

async function main() {
  const write = process.argv.includes('--write');
  const pending = await countAutoLinkCandidates();
  console.log(`candidate_links=${pending}`);
  if (!write) {
    console.log('Dry run only. Pass --write to insert rows.');
    return;
  }
  const linked = await autoLinkAllPhotoRoutes();
  console.log(`inserted=${linked}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});