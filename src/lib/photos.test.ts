import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_EDGE,
  PHOTO_THUMB_MAX_EDGE,
  fittedSize,
  isPublicBlobUrl,
  smallPhotoImageProps,
} from './photos';

test('photos shrink to a 2000px long edge and stay sharp', () => {
  assert.equal(PHOTO_MAX_EDGE, 2000);
  assert.equal(PHOTO_JPEG_QUALITY, 0.85);
  assert.deepEqual(fittedSize(4000, 3000), { width: 2000, height: 1500 });
  assert.deepEqual(fittedSize(1200, 800), { width: 1200, height: 800 });
  assert.deepEqual(fittedSize(1000, 3000), { width: 667, height: 2000 });
});

test('thumbs target a 480px long edge', () => {
  assert.equal(PHOTO_THUMB_MAX_EDGE, 480);
  assert.deepEqual(fittedSize(960, 640, PHOTO_THUMB_MAX_EDGE), { width: 480, height: 320 });
});

test('small photos prefer thumb_url without Vercel resizing', () => {
  assert.deepEqual(
    smallPhotoImageProps({ url: 'https://x.public.blob.vercel-storage.com/full.jpg', thumbUrl: 'https://x.public.blob.vercel-storage.com/thumb.jpg' }),
    { src: 'https://x.public.blob.vercel-storage.com/thumb.jpg', unoptimized: true },
  );
  assert.deepEqual(
    smallPhotoImageProps({ url: 'https://x.public.blob.vercel-storage.com/full.jpg', thumbUrl: null }),
    { src: 'https://x.public.blob.vercel-storage.com/full.jpg', unoptimized: false },
  );
});

test('only public blob urls are accepted as photo files', () => {
  assert.equal(isPublicBlobUrl('https://abc.public.blob.vercel-storage.com/photos/a.jpg'), true);
  assert.equal(isPublicBlobUrl('http://abc.public.blob.vercel-storage.com/a.jpg'), false);
  assert.equal(isPublicBlobUrl('https://example.com/a.jpg'), false);
});
