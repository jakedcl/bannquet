import type { DiscussionSection } from '@/lib/mountain-weather/bulletin-types';

function sectionKey(title: string): string {
  const inner = title.replace(/^\./, '').replace(/\.\.\..*$/, '').trim();
  return inner
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

/** Split NWS AFD/HWO productText into preamble and dot-prefixed sections; keep full body text. */
export function parseNwsDiscussionSections(productText: string): { preamble: string; sections: DiscussionSection[] } {
  const lines = productText.replace(/\r\n/g, '\n').split('\n');
  const preambleLines: string[] = [];
  const sections: DiscussionSection[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections.push({
      key: sectionKey(currentTitle),
      title: currentTitle,
      body: currentBody.join('\n'),
    });
    currentTitle = null;
    currentBody = [];
  };

  for (const line of lines) {
    if (/^\s*&&\s*$/.test(line)) {
      flush();
      continue;
    }
    const trimmed = line.trimStart();
    if (trimmed.startsWith('.') && /^\.[A-Za-z0-9]/.test(trimmed)) {
      flush();
      currentTitle = trimmed;
      continue;
    }
    if (currentTitle) currentBody.push(line);
    else preambleLines.push(line);
  }
  flush();

  return {
    preamble: preambleLines.join('\n').trim(),
    sections,
  };
}