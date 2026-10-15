export function SignupTraps({ stamp }: { stamp: string }) {
  return (
    <>
      <input type="hidden" name="issued" value={stamp} />
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}
