import { finishSignIn } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

export default async function ContinuePage() {
  await finishSignIn();
  return null;
}
