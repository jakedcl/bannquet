'use client';

import { useActionState } from 'react';
import { TrailheadPicker } from '@/components/trips/TrailheadPicker';
import { Button } from '@/components/retro/Button';
import { createTripAction } from '@/app/trips/actions';
import { ACTIVITIES, ACTIVITY_META } from '@/lib/activities';
import { loadPackingTemplates } from '@/lib/packing';

const TEMPLATES = loadPackingTemplates();

export function NewTripForm() {
  const [state, action, pending] = useActionState(createTripAction, null);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-gray-700">
        Name the day, drop a pin where you will start, and pick a packing list. Friends can say they are in.
      </p>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input name="title" required maxLength={80} className="w-full retro-box-inset bg-white px-3 py-2" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Date</span>
        <input name="tripDate" type="date" required className="w-full retro-box-inset bg-white px-3 py-2" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">What are you doing?</span>
        <select name="activity" defaultValue="hike" className="w-full retro-box-inset bg-white px-3 py-2">
          {ACTIVITIES.map((activity) => (
            <option key={activity} value={activity}>{ACTIVITY_META[activity].label}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Trailhead name</span>
        <input name="trailheadName" maxLength={80} className="w-full retro-box-inset bg-white px-3 py-2" placeholder="The Garden" />
      </label>
      <TrailheadPicker />
      <label className="block space-y-1">
        <span className="text-sm font-bold">Packing list</span>
        <select name="template" defaultValue="day-hike" className="w-full retro-box-inset bg-white px-3 py-2">
          {TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button type="submit" tone="yellow" disabled={pending}>{pending ? 'Saving…' : 'Save trip'}</Button>
    </form>
  );
}
