export function ChallengeBadge({ short }: { short: string }) {
  return (
    <span className="inline-flex min-h-11 min-w-[5.5rem] shrink-0 items-center justify-center border-2 border-ink bg-yellow px-1.5 text-center text-[10px] font-bold uppercase leading-tight text-ink shadow-[2px_2px_0_var(--color-ink)] sm:text-xs">
      {short}
      <br />
      done
    </span>
  );
}
