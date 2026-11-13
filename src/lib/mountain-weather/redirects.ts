import { PLACE_ID_ALIASES, STATE_CODES, STATE_SLUGS } from './slugs';

type Redirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

/** Permanent redirects from M3 short state and place slugs. */
export function mountainWeatherRedirects(): Redirect[] {
  const out: Redirect[] = [];

  for (const code of STATE_CODES) {
    const slug = STATE_SLUGS[code];
    out.push(
      { source: `/mountain-weather/${code}`, destination: `/mountain-weather/${slug}`, permanent: true },
      { source: `/mountain-weather/${code}/:section`, destination: `/mountain-weather/${slug}/:section`, permanent: true },
      { source: `/mountain-weather/${code}/:section/:place`, destination: `/mountain-weather/${slug}/:section/:place`, permanent: true },
    );
  }

  for (const [oldId, newId] of Object.entries(PLACE_ID_ALIASES)) {
    for (const code of STATE_CODES) {
      const slug = STATE_SLUGS[code];
      out.push(
        { source: `/mountain-weather/${slug}/:section/${oldId}`, destination: `/mountain-weather/${slug}/:section/${newId}`, permanent: true },
        { source: `/mountain-weather/${code}/:section/${oldId}`, destination: `/mountain-weather/${slug}/:section/${newId}`, permanent: true },
      );
    }
  }

  return out;
}
