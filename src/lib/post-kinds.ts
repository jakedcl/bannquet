export const POST_KINDS = ['trip_report', 'general'] as const;

export type PostKind = (typeof POST_KINDS)[number];

export const POST_KIND_LABELS: Record<PostKind, string> = {
  trip_report: 'Trip',
  general: 'General',
};

export function isPostKind(value: string): value is PostKind {
  return (POST_KINDS as readonly string[]).includes(value);
}
