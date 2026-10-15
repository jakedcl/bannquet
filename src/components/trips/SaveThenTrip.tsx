import { SubmitButton } from '@/components/ui/SubmitButton';

export function SaveThenTrip({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <SubmitButton unstyled name="next" value="existing" disabled={disabled} pendingLabel="Saving…" className="text-xs underline">
        Add to an existing trip
      </SubmitButton>
      <SubmitButton unstyled name="next" value="new" disabled={disabled} pendingLabel="Saving…" className="text-xs underline">
        Add to a new trip
      </SubmitButton>
    </div>
  );
}
