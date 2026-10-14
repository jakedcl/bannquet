import PageWrapper from '@/components/ui/PageWrapper';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Window } from '@/components/retro/Window';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? '';
  const invalid = params.error === 'INVALID_TOKEN';

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        <Window title="New password">
          {invalid ? (
            <p className="mb-4 text-sm font-bold text-red-700">
              That reset link is used or expired. Ask Jake for a new one.
            </p>
          ) : null}
          <ResetPasswordForm token={invalid ? '' : token} />
        </Window>
      </div>
    </PageWrapper>
  );
}
