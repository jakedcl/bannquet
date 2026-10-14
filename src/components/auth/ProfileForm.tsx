'use client';

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { saveProfile } from '@/app/sign-in/actions';
import { ACTIVITY_META, ACTIVITIES } from '@/lib/activities';
import { REGION_OPTIONS } from '@/lib/regions';
import { Button } from '@/components/retro/Button';
import type { Member } from '@/lib/auth/members';

export function ProfileForm({ member }: { member: Member }) {
  const [state, action, pending] = useActionState(saveProfile, null);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Display name</span>
        <input
          name="displayName"
          required
          maxLength={80}
          defaultValue={member.displayName ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
        <span className="block text-xs text-gray-600">The name your friends know you by.</span>
      </label>
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
          defaultValue={member.handle ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
        <span className="block text-xs text-gray-600">
          Your page is /user/this. Lowercase letters, numbers, and underscores.
        </span>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Home region</span>
        <select
          name="homeRegion"
          defaultValue={member.homeRegion ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        >
          <option value="">Not set</option>
          {REGION_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Favorite activities</legend>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITIES.map((activity) => (
            <label key={activity} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="favoriteActivities"
                value={activity}
                defaultChecked={member.favoriteActivities.includes(activity)}
              />
              {ACTIVITY_META[activity].label}
            </label>
          ))}
        </div>
      </fieldset>
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
      <PhotoField currentUrl={member.avatarUrl} />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

function PhotoField({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    if (!file) {
      setPreview(currentUrl);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    setPreview(url);
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-bold">Photo</span>
      <div className="flex items-center gap-4">
        <div className="retro-box flex h-20 w-20 items-center justify-center overflow-hidden bg-gray-100">
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
            onClick={() => inputRef.current?.click()}
          >
            Choose photo
          </button>
          <input
            ref={inputRef}
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onChange}
          />
          <span className="mt-1 block text-xs text-gray-600">Optional. JPG or PNG, under 2 MB.</span>
        </div>
      </div>
    </div>
  );
}
