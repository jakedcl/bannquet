export const dynamic = 'force-dynamic';

const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

function tileIndex(value: string, zoom: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const index = Number(value);
  const limit = 2 ** zoom;
  if (!Number.isInteger(index) || index < 0 || index >= limit) return null;
  return index;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await context.params;
  if (!/^\d+$/.test(z)) return new Response(null, { status: 400 });
  const zoom = Number(z);
  if (zoom < 0 || zoom > 15) return new Response(null, { status: 400 });
  const tileX = tileIndex(x, zoom);
  const tileY = tileIndex(y.replace(/\.png$/, ''), zoom);
  if (tileX == null || tileY == null) return new Response(null, { status: 400 });

  const upstream = await fetch(`${TERRARIUM}/${zoom}/${tileX}/${tileY}.png`);
  if (!upstream.ok) return new Response(null, { status: upstream.status });

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
