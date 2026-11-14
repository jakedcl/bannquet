import type { BulletinOffice, NwsTextProduct } from '@/lib/mountain-weather/bulletin-types';
import { readAfdForOffice } from '@/lib/mountain-weather/readers/nws-afd';
import { readHwoBtv } from '@/lib/mountain-weather/readers/nws-hwo-btv';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

export type OfficeBulletinBundle = {
  office: BulletinOffice;
  afd: SourceResult<NwsTextProduct>;
  hwo: SourceResult<NwsTextProduct> | null;
};

export async function readOfficeBulletins(office: BulletinOffice): Promise<OfficeBulletinBundle> {
  const afd = await readAfdForOffice(office);
  const hwo = office === 'BTV' ? await readHwoBtv() : null;
  return { office, afd, hwo };
}