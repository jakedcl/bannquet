export type SourceKind = 'forecast' | 'measured' | 'modeled' | 'derived' | 'official';

export type SourceTerms = 'reuse-ok' | 'link-only' | 'ask-first' | 'key-needed';

export type SourceDef = {
  id: string;
  org: string;
  kind: SourceKind;
  terms: SourceTerms;
  /** Fetch address or template with `{param}` placeholders. */
  url: string;
  ttlSeconds: number;
  expectedEveryHours?: number;
  season?: 'winter' | 'summer';
};

export type SourceStatus = 'ok' | 'stale' | 'seasonal-off' | 'link-only' | 'error';

export type SourceResult<T> = {
  status: SourceStatus;
  data: T | null;
  issuedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  sourceUrl: string;
  error?: string;
};
