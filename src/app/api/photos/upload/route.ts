import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getViewer } from '@/app/sign-in/actions';

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return Response.json({ error: 'Sign in to add a photo.' }, { status: 401 });
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
    const message = error instanceof Error ? error.message : 'Photo upload is not set up yet.';
    return Response.json({ error: message }, { status: 400 });
  }
}
