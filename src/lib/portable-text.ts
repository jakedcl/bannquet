export type ExtractedImage = {
  assetRef: string | null;
  caption: string | null;
  alt: string | null;
};

type SanitySpan = {
  text?: unknown;
  marks?: unknown;
};

type SanityMarkDef = {
  _key?: unknown;
  _type?: unknown;
  href?: unknown;
};

type SanityBlock = {
  _type?: unknown;
  listItem?: unknown;
  children?: unknown;
  markDefs?: unknown;
  asset?: unknown;
  caption?: unknown;
  alt?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function spanText(span: SanitySpan, markDefs: Map<string, SanityMarkDef>): string {
  const text = typeof span.text === 'string' ? span.text : '';
  const marks = Array.isArray(span.marks) ? span.marks : [];
  const link = marks
    .map((mark) => (typeof mark === 'string' ? markDefs.get(mark) : undefined))
    .find((def) => def?._type === 'link' && typeof def.href === 'string');
  if (link && typeof link.href === 'string' && !text.includes(link.href)) {
    return `${text} (${link.href})`;
  }
  return text;
}

function imageFromBlock(block: SanityBlock): ExtractedImage {
  let assetRef: string | null = null;
  if (typeof block.asset === 'string') {
    assetRef = block.asset;
  } else if (block.asset && typeof block.asset === 'object' && '_ref' in block.asset) {
    const ref = (block.asset as { _ref?: unknown })._ref;
    assetRef = typeof ref === 'string' ? ref : null;
  }
  return {
    assetRef,
    caption: asString(block.caption),
    alt: asString(block.alt),
  };
}

/**
 * Turns a Sanity portable-text body into paragraphs.
 * Images are pulled out so the importer can store them as photo rows.
 */
export function portableTextToPlainText(input: unknown): { text: string; images: ExtractedImage[] } {
  const images: ExtractedImage[] = [];
  if (!Array.isArray(input)) {
    return { text: '', images };
  }

  const paragraphs: string[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as SanityBlock;
    if (block._type === 'image') {
      images.push(imageFromBlock(block));
      continue;
    }
    if (block._type !== 'block' || !Array.isArray(block.children)) continue;

    const markDefs = new Map<string, SanityMarkDef>();
    if (Array.isArray(block.markDefs)) {
      for (const def of block.markDefs) {
        if (def && typeof def === 'object' && typeof (def as SanityMarkDef)._key === 'string') {
          markDefs.set((def as SanityMarkDef)._key as string, def as SanityMarkDef);
        }
      }
    }

    const text = block.children
      .filter((child): child is SanitySpan => !!child && typeof child === 'object')
      .map((child) => spanText(child, markDefs))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;

    const prefix = block.listItem === 'number' ? '1. ' : block.listItem ? '- ' : '';
    paragraphs.push(`${prefix}${text}`);
  }

  return { text: paragraphs.join('\n\n'), images };
}

const ASSET_REF = /^image-(.+)-(\d+)x(\d+)-([a-z0-9]+)$/i;

export function sanityAssetUrl(
  projectId: string,
  dataset: string,
  assetRef: string,
): { url: string; width: number; height: number; filename: string } | null {
  const match = ASSET_REF.exec(assetRef);
  if (!match) return null;
  const [, id, width, height, ext] = match;
  return {
    url: `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${width}x${height}.${ext}`,
    width: Number(width),
    height: Number(height),
    filename: `${id}.${ext}`,
  };
}
