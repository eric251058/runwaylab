-- Extend existing FabricStatus enum.
-- PostgreSQL requires newly added enum values to be committed
-- before they are used by tables or default values.

ALTER TYPE "FabricStatus" ADD VALUE IF NOT EXISTS 'UNKNOWN';
ALTER TYPE "FabricStatus" ADD VALUE IF NOT EXISTS 'RECOMMENDED';
ALTER TYPE "FabricStatus" ADD VALUE IF NOT EXISTS 'SELECTED';
ALTER TYPE "FabricStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
