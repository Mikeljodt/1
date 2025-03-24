-- MIGRATION 000: ENABLE REQUIRED EXTENSIONS
-- This migration ensures all required PostgreSQL extensions are enabled
-- before other migrations that depend on them

-- Enable the pg_trgm extension for text search capabilities
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Add a record to track this migration
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  description TEXT
);

INSERT INTO public.schema_migrations (version, description) 
VALUES ('000', 'Enable required extensions')
ON CONFLICT (version) DO NOTHING;
