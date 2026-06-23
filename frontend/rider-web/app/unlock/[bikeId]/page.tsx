import { redirect } from 'next/navigation';

export default function UnlockRedirect({ params }: { params: { bikeId: string } }) {
  // Deep link from QR code scanner for direct unlock. 
  // Redirect to the main map overlay.
  redirect(`/?bike=${params.bikeId}&action=unlock`);
}
