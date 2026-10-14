export function ChallengeBadge({ short }: { short: string }) {
  return (
    <span className="inline-flex h-[31px] w-[88px] shrink-0 items-center justify-center border-2 border-black bg-[#ffe14a] px-1 text-center text-[8px] font-bold uppercase leading-tight text-black shadow-[2px_2px_0_#000]">
      {short}
      <br />
      done
    </span>
  );
}
