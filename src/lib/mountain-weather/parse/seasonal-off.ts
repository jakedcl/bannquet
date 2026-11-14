const OFF_SEASON_PATTERNS = [
  /not currently being produced/i,
  /check back closer to summer/i,
  /check back in the summer/i,
];

export function detectSeasonalOffMessage(text: string): string | null {
  for (const re of OFF_SEASON_PATTERNS) {
    if (re.test(text)) {
      const match = text.match(/not currently being produced[^.]*\./i);
      if (match) return match[0].trim();
      return 'This product is not currently being produced.';
    }
  }
  return null;
}

export function defaultResumeHint(type: string | null): string {
  if (type === 'Lake' || type === 'Beach' || type === 'Island') {
    return 'Off season — usually resumes in late spring or summer.';
  }
  if (type === 'AVG') {
    return 'Off season — avalanche weather guidance usually resumes in late fall.';
  }
  if (type === 'HYD' || type === 'stake') {
    return 'Off season — snow stake summaries usually resume when winter reporting begins.';
  }
  return 'Off season — check back when the product resumes.';
}
