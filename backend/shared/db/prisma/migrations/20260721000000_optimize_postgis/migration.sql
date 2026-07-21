-- Create a GiST Expression Index on Docks for O(log N) proximity searches
CREATE INDEX IF NOT EXISTS docks_spatial_idx ON docks USING GIST (
  (ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography)
);

-- Create a GiST Expression Index on Geofences for O(log N) containment checks
CREATE INDEX IF NOT EXISTS geofences_spatial_idx ON geofences USING GIST (
  ST_SetSRID(ST_GeomFromGeoJSON(boundary::text), 4326)
);
