import { inflateSync } from 'node:zlib';
import { terrariumHeight } from '@/lib/peak-finder/tiles';

function paeth(left: number, up: number, upLeft: number): number {
  const guess = left + up - upLeft;
  const leftDiff = Math.abs(guess - left);
  const upDiff = Math.abs(guess - up);
  const diagDiff = Math.abs(guess - upLeft);
  if (leftDiff <= upDiff && leftDiff <= diagDiff) return left;
  if (upDiff <= diagDiff) return up;
  return upLeft;
}

/** Decode an AWS Terrarium RGB elevation PNG into a 256×256 height grid (metres). */
export function decodeTerrariumPng(buf: Buffer): Float32Array {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 2;
  const parts: Buffer[] = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`Unexpected terrain PNG ${data[8]}/${colorType}`);
      }
    } else if (type === 'IDAT') parts.push(Buffer.from(data));
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (width !== 256 || height !== 256) {
    throw new Error(`Expected 256×256 Terrarium tile, got ${width}×${height}`);
  }
  const inflated = inflateSync(Buffer.concat(parts));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src];
    src += 1;
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const byte = inflated[src];
      src += 1;
      const left = x >= channels ? raw[row + x - channels] : 0;
      const up = y > 0 ? raw[row - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? raw[row - stride + x - channels] : 0;
      let value = byte;
      if (filter === 1) value = (byte + left) & 255;
      else if (filter === 2) value = (byte + up) & 255;
      else if (filter === 3) value = (byte + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (byte + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`PNG filter ${filter}`);
      raw[row + x] = value;
    }
  }
  const heights = new Float32Array(width * height);
  for (let i = 0; i < heights.length; i += 1) {
    const pixel = i * channels;
    heights[i] = terrariumHeight(raw[pixel], raw[pixel + 1], raw[pixel + 2]);
  }
  return heights;
}