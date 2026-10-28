import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getViewer } from '@/app/sign-in/actions';
import { loadFailed } from '@/lib/load-error';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return Response.json({ error: 'Sign in to add a photo.' }, { status: 401 });
  }
  if (!canContribute(viewer.role)) {
    return Response.json({ error: APPROVAL_WAIT }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        addRandomSuffix: true,
        maximumSizeInBytes: 5 * 1024 * 1024,
      }),
    });
    return Response.json(json);
  } catch (error) {
    return Response.json({ error: loadFailed('photo upload', error, 'That photo did not upload. Try again.') }, { status: 400 });
  }
}
