import assert from 'node:assert/strict';
import test from 'node:test';
import { portableTextToPlainText, sanityAssetUrl } from './portable-text';

test('portable text becomes paragraphs and image refs', () => {
  const result = portableTextToPlainText([
    {
      _type: 'block',
      style: 'h2',
      children: [{ _type: 'span', text: 'Ridge day' }],
    },
    {
      _type: 'block',
      children: [
        { _type: 'span', text: 'See ' },
        { _type: 'span', text: 'the map', marks: ['link1'] },
      ],
      markDefs: [{ _key: 'link1', _type: 'link', href: 'https://example.com/map' }],
    },
    {
      _type: 'block',
      listItem: 'bullet',
      children: [{ _type: 'span', text: 'Microspikes' }],
    },
    {
      _type: 'image',
      asset: { _ref: 'image-abc-1200x800-jpg' },
      caption: 'Summit',
      alt: 'Marcy',
    },
  ]);

  assert.equal(
    result.text,
    'Ridge day\n\nSee the map (https://example.com/map)\n\n- Microspikes',
  );
  assert.deepEqual(result.images, [
    { assetRef: 'image-abc-1200x800-jpg', caption: 'Summit', alt: 'Marcy' },
  ]);
});

test('non-arrays and empty blocks do not throw', () => {
  assert.deepEqual(portableTextToPlainText(null), { text: '', images: [] });
  assert.deepEqual(portableTextToPlainText([{ _type: 'block', children: [] }]), {
    text: '',
    images: [],
  });
});

test('sanity asset refs become CDN urls', () => {
  const parsed = sanityAssetUrl('proj', 'production', 'image-abc-1200x800-jpg');
  assert.equal(
    parsed?.url,
    'https://cdn.sanity.io/images/proj/production/abc-1200x800.jpg',
  );
  assert.equal(parsed?.width, 1200);
  assert.equal(parsed?.filename, 'abc.jpg');
  assert.equal(sanityAssetUrl('proj', 'production', 'not-an-image'), null);
});
