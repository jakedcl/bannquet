import { upload } from '@vercel/blob/client';
import { fittedSize, PHOTO_JPEG_QUALITY } from '@/lib/photos';

const AVATAR_MAX_EDGE = 512;

export async function prepareAvatar(file: File): Promise<{ url: string; previewUrl: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Use a photo file, like a JPG or PNG.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not use that photo. Try a JPG or PNG.');
  }
  const size = fittedSize(bitmap.width, bitmap.height, AVATAR_MAX_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not use that photo. Try a JPG or PNG.');
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not use that photo. Try a JPG or PNG.');

  try {
    const stored = await upload(`avatars/${crypto.randomUUID()}.jpg`, blob, {
      access: 'public',
      handleUploadUrl: '/api/photos/upload',
      contentType: 'image/jpeg',
    });
    return { url: stored.url, previewUrl: URL.createObjectURL(blob) };
  } catch {
    throw new Error('That photo did not upload. Try again.');
  }
}
