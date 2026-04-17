'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

export default function StudioPage() {
  return (
    <div className="fixed inset-0" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <NextStudio config={config} />
    </div>
  );
}
