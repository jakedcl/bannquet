import PageWrapper from '@/components/ui/PageWrapper';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Card } from '@/components/hub/Card';
import { HubPage } from '@/components/hub/Page';

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
      <HubPage title="New password" width="lg">
        <Card>
          {invalid ? (
            <p className="mb-4 text-sm font-bold text-red-700">
              That reset link is used or expired. Ask Jake for a new one.
            </p>
          ) : null}
          <ResetPasswordForm token={invalid ? '' : token} />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
