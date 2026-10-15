'use client';

import { useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { saveProfile } from '@/app/sign-in/actions';
import { prepareAvatar } from '@/components/auth/prepare-avatar';
import { homeStateCode, US_STATES } from '@/lib/us-states';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { Member } from '@/lib/auth/members';

export function ProfileForm({ member }: { member: Member }) {
  const [state, action] = useActionState(saveProfile, null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (photoBusy) event.preventDefault();
  }

  return (
    <form action={action} className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Display name</span>
        <input
          name="displayName"
          required
          maxLength={80}
          defaultValue={member.displayName ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      {member.handle ? (
        <div className="space-y-1">
          <p className="text-sm font-bold">Username</p>
          <p className="text-base">{member.handle}</p>
        </div>
      ) : (
        <label className="block space-y-1">
          <span className="text-sm font-bold">Username</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={24}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full retro-box-inset bg-white px-3 py-2 text-base"
          />
          <span className="block text-xs text-gray-600">
            Lowercase letters, numbers, and underscores. This becomes your page address.
          </span>
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-bold">Home region</span>
        <select
          name="homeRegion"
          defaultValue={homeStateCode(member.homeRegion) ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        >
          <option value="">Not set</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">About you</span>
        <textarea
          name="bio"
          maxLength={500}
          rows={4}
          defaultValue={member.bio ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <PhotoField
        currentUrl={member.avatarUrl}
        busy={photoBusy}
        onBusy={setPhotoBusy}
        onError={setPhotoError}
      />
      {state?.error || photoError ? (
        <p className="text-sm font-bold text-red-700">{photoError || state?.error}</p>
      ) : null}
      <SubmitButton tone="green" pendingLabel="Saving…" disabled={photoBusy}>
        {photoBusy ? 'Preparing photo…' : 'Save profile'}
      </SubmitButton>
    </form>
  );
}

function PhotoField({
  currentUrl,
  busy,
  onBusy,
  onError,
}: {
  currentUrl: string | null;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    if (!file) return;
    onBusy(true);
    onError(null);
    setAvatarUrl('');
    try {
      const prepared = await prepareAvatar(file);
      objectUrl.current = prepared.previewUrl;
      setPreview(prepared.previewUrl);
      setAvatarUrl(prepared.url);
    } catch (err) {
      setPreview(currentUrl);
      setAvatarUrl('');
      onError(err instanceof Error ? err.message : 'That photo did not upload. Try again.');
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-bold">Photo</span>
      <div className="flex items-center gap-4">
        <div className="avatar-frame flex h-20 w-20 items-center justify-center">
          {preview ? (
            // Native img: the preview is a blob: URL, which next/image does not accept.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">None</span>
          )}
        </div>
        <div>
          <button
            type="button"
            className="retro-button retro-button-blue"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Choose photo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => { void onChange(event); }}
          />
          <input type="hidden" name="avatarUrl" value={avatarUrl} />
          <span className="mt-1 block text-xs text-gray-600">
            {busy ? 'Preparing photo…' : 'Optional. JPG or PNG.'}
          </span>
        </div>
      </div>
    </div>
  );
}
