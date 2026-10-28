import { redirect } from 'next/navigation';

export default function StockingPage() {
  redirect('/fishing/freshwater?state=ny&tab=stocking');
}
