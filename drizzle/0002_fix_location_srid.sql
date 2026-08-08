UPDATE courts SET location = ST_SetSRID(location, 4326) WHERE ST_SRID(location) <> 4326;
--> statement-breakpoint
ALTER TABLE courts ALTER COLUMN location TYPE geometry(Point, 4326) USING ST_SetSRID(location, 4326);
