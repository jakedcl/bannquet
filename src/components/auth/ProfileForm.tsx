'use client';

import { useActionState } from 'react';
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
        <span className="text-sm font-bold">Name</span>
        <input
          name="displayName"
          required
          maxLength={80}
          defaultValue={member.displayName ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Handle</span>
        <input
          name="handle"
          required
          minLength={3}
          maxLength={24}
          defaultValue={member.handle ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
        <span className="block text-xs text-gray-600">Shows up in your page address. Letters, numbers, and hyphens.</span>
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
      <label className="block space-y-1">
        <span className="text-sm font-bold">Photo</span>
        <input name="avatar" type="file" accept="image/*" className="block w-full text-sm" />
        <span className="block text-xs text-gray-600">Optional. JPG or PNG, under 2 MB.</span>
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
