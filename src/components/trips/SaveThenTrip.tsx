export function SaveThenTrip({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="submit" name="next" value="existing" disabled={disabled} className="text-xs underline disabled:opacity-60">
        Add to an existing trip
      </button>
      <button type="submit" name="next" value="new" disabled={disabled} className="text-xs underline disabled:opacity-60">
        Add to a new trip
      </button>
    </div>
  );
}
