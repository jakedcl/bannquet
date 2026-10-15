export const CHAT_KINDS = ['pin', 'route', 'photo'] as const;
export type ChatRefKind = (typeof CHAT_KINDS)[number];

export type ChatRef = {
  kind: ChatRefKind;
  id: string;
  label: string;
  href: string;
  thumb: string | null;
  missing: boolean;
};

export type ChatMessage = {
  id: string;
  userId: string | null;
  body: string;
  createdAt: string;
  name: string;
  handle: string | null;
  ref: ChatRef | null;
};

export function isChatRefKind(value: string): value is ChatRefKind {
  return (CHAT_KINDS as readonly string[]).includes(value);
}

export function formatChatTime(isoTime: string): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
