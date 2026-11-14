import type { MountainWfo } from '@/lib/mountain-weather/nws-office';

export type BulletinOffice = MountainWfo;

export type DiscussionSection = {
  key: string;
  title: string;
  body: string;
};

export type NwsTextProduct = {
  productCode: string;
  productId: string | null;
  preamble: string;
  sections: DiscussionSection[];
  rawText: string;
};

export type OfficeBulletins = {
  office: BulletinOffice;
  afd: NwsTextProduct;
  hwo: NwsTextProduct | null;
};