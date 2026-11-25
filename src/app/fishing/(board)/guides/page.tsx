import { redirect } from 'next/navigation';

export const metadata = { title: 'Fishing guides' };

export default function GuidesPage() {
  redirect('/fishing/freshwater');
}
