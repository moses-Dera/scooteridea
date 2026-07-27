import { useState, useEffect } from 'react';

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'operational' | 'slow' | 'no_ride' | 'dock';
  speedCap: number | null;
  boundary: any; // GeoJSON Polygon geometry
}

export function useGeofences() {
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/proxy/fleet/geofences')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setZones(data.data);
        }
      })
      .catch((err) => console.error('Failed to load geofences:', err))
      .finally(() => setLoading(false));
  }, []);

  return { zones, loading };
}
