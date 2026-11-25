import { redirect } from 'next/navigation';

export const metadata = { title: 'Fish stocking' };

export default function StockingPage() {
  redirect('/fishing/freshwater?state=ny&tab=stocking');
}
