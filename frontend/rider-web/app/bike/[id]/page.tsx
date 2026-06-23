import { redirect } from 'next/navigation';

export default function BikeDetailRedirect({ params }: { params: { id: string } }) {
  // Deep link from QR code scanner. Redirect to the main map overlay.
  redirect(`/?bike=${params.id}`);
}
