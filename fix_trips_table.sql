ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by_role TEXT CHECK (created_by_role IN ('client', 'dispatcher', 'admin', 'facility'));

CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);

CREATE INDEX IF NOT EXISTS idx_trips_created_by_role ON trips(created_by_role);