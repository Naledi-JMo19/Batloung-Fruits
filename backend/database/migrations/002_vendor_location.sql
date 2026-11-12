-- Adds map coordinates to street vendors WITHOUT deleting existing data.
-- Run once:  mysql -u root -p batloung_fruits < backend/database/migrations/002_vendor_location.sql
ALTER TABLE street_vendors
  ADD COLUMN latitude DECIMAL(10,7) NULL AFTER location_area,
  ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude,
  ADD CONSTRAINT chk_vendor_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT chk_vendor_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
