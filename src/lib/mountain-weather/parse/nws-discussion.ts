import type { DiscussionSection } from '@/lib/mountain-weather/bulletin-types';

function sectionKey(title: string): string {
  const inner = title.replace(/^\./, '').replace(/\.\.\..*$/, '').trim();
  return inner
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

/**
 * Drop the transmission header ("000", "FXUS61 KGYX 192310", "AFDGYX") that precedes the
 * product title, and squeeze runs of blank lines. The full product stays on the source link.
 */
function cleanPreamble(lines: string[]): string {
  const kept = lines.filter((line, i) => {
    const t = line.trim();
    if (i < 4 && /^\d{3}$/.test(t)) return false;
    if (/^[A-Z]{4}\d{2}\s+K[A-Z]{3}\s+\d{6}(\s+[A-Z]{3})?$/.test(t)) return false;
    if (i < 6 && /^[A-Z]{3}[A-Z0-9]{3}$/.test(t)) return false;
    return true;
  });
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
    if (/^\s*\$\$\s*$/.test(line)) continue;
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
    preamble: cleanPreamble(preambleLines),
    sections,
  };
}