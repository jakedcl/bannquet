import type { FzlOffice, FzlPlaceSlice } from '@/lib/mountain-weather/fzl-types';
import type { MountainPlace } from '@/lib/mountain-weather/places';
import { readFzlBulletin } from '@/lib/mountain-weather/readers/nws-fzl';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

function fzlOfficeForPlace(office: string): FzlOffice | null {
  if (office === 'ALY' || office === 'GYX') return office;
  return null;
}

export async function readFzlForPlace(place: MountainPlace): Promise<SourceResult<FzlPlaceSlice> | null> {
  const office = fzlOfficeForPlace(place.office);
  if (!office) return null;
  const bulletin = await readFzlBulletin(office);
  if (bulletin.status === 'error' || !bulletin.data) {
    return { ...bulletin, data: null };
  }
  return {
    ...bulletin,
    data: { office, bulletin: bulletin.data },
  };
}