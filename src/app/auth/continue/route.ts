import { finishSignIn } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

// Cookie changes are refused while a page renders. This handler runs in the
// action phase, so it can drop the profile claim and send the person onward.
export async function GET() {
  await finishSignIn();
  return new Response(null, { status: 204 });
}
