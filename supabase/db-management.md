# Supabase Database Management

This guide outlines best practices for managing your Supabase database, including schema migrations, backups, and maintenance.

## 1. Schema Migrations

### Migration Process Overview

1. Initialize migrations in a dedicated folder:
   ```bash
   mkdir -p supabase/migrations
   ```

2. Use sequential numbering for migration files:
   - `001_initial_schema.sql`
   - `002_authentication_setup.sql`
   - `003_row_level_security.sql`
   - `004_functions_and_triggers.sql`
   - `005_add_created_by_fields.sql`

3. Apply migrations manually or via CI/CD:
   ```bash
   psql -h YOUR_SUPABASE_DB_HOST -p 5432 -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
   ```

4. Track migration status in a migrations table:

```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  description TEXT
);

-- After running a migration, add an entry
INSERT INTO public.schema_migrations 
(version, description) 
VALUES ('001', 'Initial schema');
```

### Rollback Strategy

For each migration, create a corresponding rollback file:
- `001_initial_schema_rollback.sql`
- `002_authentication_setup_rollback.sql`

Example rollback file:

```sql
-- 001_initial_schema_rollback.sql
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.machine_history CASCADE;
-- ...drop other tables...

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = '001';
```

## 2. Database Backups

### Automated Backups

Supabase Pro and Enterprise plans include automated backups. For additional safety:

1. Set up a periodic backup script using `pg_dump`:

```bash
#!/bin/bash
# backup.sh

# Configuration
DB_HOST="your-db-host"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="your-password"
BACKUP_DIR="/path/to/backups"

# Create backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/rekreativ_backup_$TIMESTAMP.sql"

# Run pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

# Optionally, remove backups older than 30 days
find $BACKUP_DIR -name "rekreativ_backup_*.sql.gz" -mtime +30 -delete
```

2. Schedule this script to run daily using a cron job:
   ```
   0 3 * * * /path/to/backup.sh
   ```

### Manual Backups

For manual backups from the Supabase dashboard:

1. Go to Project Settings > Database
2. Use the "Generate a database backup" option
3. Download and securely store the backup file

## 3. Database Maintenance

### Regular Tasks

1. Vacuum the database to reclaim space and improve performance:

```sql
-- Analyze all tables for query planner
ANALYZE;

-- Vacuum to reclaim space
VACUUM FULL;

-- Vacuum and analyze in one command
VACUUM ANALYZE;
```

2. Update statistics for the query planner:

```sql
-- Update statistics for all tables
ANALYZE;

-- Update statistics for specific table
ANALYZE public.collections;
```

3. Find and fix bloated tables:

```sql
SELECT
  schemaname || '.' || relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS external_size,
  ROUND(100 * pg_relation_size(relid) / pg_total_relation_size(relid)) AS table_percent
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

4. Check for unused indexes:

```sql
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
  idx_scan AS index_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique AND idx_scan < 50
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

5. Implement a maintenance function:

```sql
CREATE OR REPLACE FUNCTION public.maintenance()
RETURNS void LANGUAGE plpgsql
AS $$
BEGIN
  -- Update statistics
  ANALYZE;
  
  -- Clean up indexes
  REINDEX DATABASE postgres;
  
  -- Record maintenance run
  INSERT INTO public.maintenance_log (operation, details)
  VALUES ('routine', 'Analyzed tables and reindexed database');
END;
$$;

-- Create log table
CREATE TABLE IF NOT EXISTS public.maintenance_log (
  id SERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  details TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

## 4. Performance Monitoring

###### Query Performance Monitoring

Set up monitoring to identify slow queries:

```sql
-- Create a table to store slow query logs
CREATE TABLE IF NOT EXISTS public.slow_query_log (
  id SERIAL PRIMARY KEY,
  query_text TEXT,
  duration INTERVAL,
  database_name TEXT,
  username TEXT,
  application_name TEXT,
  client_addr INET,
  query_start TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up pg_stat_statements extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query to find slow queries
SELECT
  round(mean_exec_time::numeric, 2) AS avg_time_ms,
  calls,
  round((100 * total_exec_time / sum(total_exec_time) OVER())::numeric, 2) AS percent_overall,
  substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Connection Monitoring

Check for connection issues:

```sql
-- Current connections
SELECT 
  datname AS database,
  usename AS username,
  application_name,
  client_addr,
  state,
  count(*) AS connection_count
FROM pg_stat_activity
GROUP BY 1, 2, 3, 4, 5
ORDER BY connection_count DESC;

-- Connection history (requires setting up logging)
SELECT
  date_trunc('hour', captured_at) AS hour,
  count(*) AS connection_count
FROM connection_log
GROUP BY 1
ORDER BY 1 DESC;
```

## 5. Index Management

### Index Creation Guidelines

1. Create indexes for foreign keys:

```sql
-- Identify missing foreign key indexes
SELECT
  c.conrelid::regclass AS table_name,
  a.attname AS column_name,
  c.conname AS constraint_name,
  'CREATE INDEX idx_' || t.relname || '_' || a.attname || ' ON ' 
    || c.conrelid::regclass || ' (' || a.attname || ');' AS create_index_statement
FROM
  pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_class t ON t.oid = c.conrelid
  LEFT JOIN pg_index i ON i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
WHERE
  c.contype = 'f'
  AND i.indexrelid IS NULL;
```

2. Create indexes for frequently queried columns:

```sql
-- Add indexes for commonly used query patterns
CREATE INDEX idx_collections_date ON collections (date);
CREATE INDEX idx_expenses_type ON expenses (type);
CREATE INDEX idx_machines_status ON machines (status);
```

3. Use GIN indexes for text search:

```sql
-- Add text search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for text search on client names
CREATE INDEX idx_clients_name_gin ON clients USING gin (name gin_trgm_ops);
```

### Index Maintenance

Regularly check for and remove unused indexes:

```sql
-- Find unused indexes (run during peak usage times)
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
  idx_scan AS index_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique AND idx_scan < 50
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

## 6. Data Archiving Strategy

For managing large datasets:

```sql
-- Create archive tables with same structure as original tables
CREATE TABLE collections_archive 
(LIKE collections INCLUDING ALL);

-- Function to archive old data
CREATE OR REPLACE FUNCTION archive_old_collections(older_than INTERVAL)
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Move records to archive
  INSERT INTO collections_archive
  SELECT * FROM collections
  WHERE date < (CURRENT_DATE - older_than);
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Delete from main table
  DELETE FROM collections
  WHERE date < (CURRENT_DATE - older_than);
  
  -- Log the archiving
  INSERT INTO maintenance_log (operation, details)
  VALUES ('archive', format('Archived %s collections older than %s', 
                            archived_count, older_than));
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Example usage: Archive collections older than 1 year
SELECT archive_old_collections('1 year');
```

## 7. Security Audit Procedures

Regular security checks for your database:

```sql
-- Check for public schema permissions
SELECT 
  n.nspname AS schema,
  CASE WHEN pg_catalog.has_schema_privilege('public', n.nspname, 'USAGE') 
       THEN 'YES' ELSE 'NO' END AS public_has_usage,
  CASE WHEN pg_catalog.has_schema_privilege('public', n.nspname, 'CREATE') 
       THEN 'YES' ELSE 'NO' END AS public_has_create
FROM pg_catalog.pg_namespace n
WHERE n.nspname NOT LIKE 'pg_%'
ORDER BY schema;

-- Check table permissions
SELECT
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ') AS privileges
FROM information_schema.table_privileges
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema, table_name, grantee
ORDER BY table_schema, table_name;

-- Check if RLS is enabled
SELECT
  schemaname || '.' || tablename AS table_name,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'RLS enabled' ELSE 'RLS disabled!' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY schemaname, tablename;
```

## 8. Database Scaling Plan

As your application grows:

### 1. Implement Connection Pooling

Set up pg_bouncer through Supabase dashboard:

1. Go to Project Settings > Database
2. Enable and configure connection pooling settings
3. Update application connection strings to use the pooler endpoint

### 2. Table Partitioning for Large Tables

For tables like `collections` that grow quickly:

```sql
-- Create partitioned table for collections
CREATE TABLE collections_partitioned (
  id UUID NOT NULL,
  machine_id UUID NOT NULL,
  client_id INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  previous_counter INTEGER NOT NULL,
  current_counter INTEGER NOT NULL,
  notes TEXT,
  ticket_number TEXT,
  invoice_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
) PARTITION BY RANGE (date);

-- Create quarterly partitions
CREATE TABLE collections_y2023_q1 PARTITION OF collections_partitioned
FOR VALUES FROM ('2023-01-01') TO ('2023-04-01');

CREATE TABLE collections_y2023_q2 PARTITION OF collections_partitioned
FOR VALUES FROM ('2023-04-01') TO ('2023-07-01');

-- Function to create future partitions automatically
CREATE OR REPLACE FUNCTION create_future_partition()
RETURNS void AS $$
DECLARE
  next_quarter DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Get the latest partition end date
  SELECT MAX(pg_catalog.obj_description(
    (schemaname || '.' || tablename)::regclass, 'pg_class')::DATE)
  INTO next_quarter
  FROM pg_tables
  WHERE tablename LIKE 'collections_y%'
    AND schemaname = 'public';
  
  -- Default to current date if no partitions exist
  IF next_quarter IS NULL THEN
    next_quarter := DATE_TRUNC('quarter', CURRENT_DATE);
  END IF;
  
  -- Create the next 4 quarters
  FOR i IN 1..4 LOOP
    start_date := next_quarter + ((i-1) * INTERVAL '3 months');
    end_date := start_date + INTERVAL '3 months';
    
    partition_name := 'collections_y' || 
                     TO_CHAR(start_date, 'YYYY') || '_q' || 
                     TO_CHAR(EXTRACT(QUARTER FROM start_date), '9');
    
    -- Check if partition already exists
    PERFORM 1
    FROM pg_tables
    WHERE tablename = partition_name
      AND schemaname = 'public';
    
    IF NOT FOUND THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF collections_partitioned 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
      
      -- Store the end date in table comment for future reference
      EXECUTE format(
        'COMMENT ON TABLE %I IS %L',
        partition_name, end_date
      );
      
      -- Log partition creation
      INSERT INTO maintenance_log (operation, details)
      VALUES ('create_partition', format('Created partition %s for %s to %s', 
                                       partition_name, start_date, end_date));
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 3. Implement Read Replicas

For Enterprise tier Supabase projects, set up read replicas:

1. Enable read replicas in Project Settings > Database
2. Use connection pooling with replicas for read operations
3. Update application code to route read and write operations appropriately

## 9. Data Integrity Checks

Implement regular integrity checks:

```sql
-- Create a function to check data integrity
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  orphaned_count INTEGER;
  duplicate_count INTEGER;
  null_count INTEGER;
BEGIN
  -- Check for orphaned machine_history records
  SELECT COUNT(*) INTO orphaned_count
  FROM machine_history mh
  LEFT JOIN machines m ON mh.machine_id = m.id
  WHERE m.id IS NULL;
  
  check_name := 'orphaned_machine_history';
  status := CASE WHEN orphaned_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('%s orphaned records found', orphaned_count);
  RETURN NEXT;
  
  -- Check for duplicate serial numbers
  SELECT COUNT(*) - COUNT(DISTINCT serial_number) INTO duplicate_count
  FROM machines;
  
  check_name := 'duplicate_serial_numbers';
  status := CASE WHEN duplicate_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('%s duplicate serial numbers found', duplicate_count);
  RETURN NEXT;
  
  -- Check for null machine counter values
  SELECT COUNT(*) INTO null_count
  FROM machines
  WHERE current_counter IS NULL;
  
  check_name := 'null_machine_counters';
  status := CASE WHEN null_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('%s machines with null counters found', null_count);
  RETURN NEXT;
  
  -- More checks can be added here
END;
$$ LANGUAGE plpgsql;
```

## 10. Database Deployment Checklist

Pre-deployment checklist for database changes:

1. **Schema Changes**
   - [ ] Migration files are numbered sequentially
   - [ ] Rollback scripts are provided for each migration
   - [ ] Foreign key constraints include ON DELETE/UPDATE actions
   - [ ] Appropriate indexes are created for new tables
   - [ ] RLS policies are in place for new tables

2. **Data Migration**
   - [ ] Plan for migrating existing data is documented
   - [ ] Data transformation scripts are tested
   - [ ] Backup is created before migration

3. **Performance**
   - [ ] New queries are analyzed with EXPLAIN ANALYZE
   - [ ] Indexes are added for frequent query patterns
   - [ ] Large data operations use batching

4. **Security**
   - [ ] RLS policies are tested for all user roles
   - [ ] No sensitive data is exposed in public schemas
   - [ ] Proper input validation on all user-provided data

5. **Deployment Process**
   - [ ] Deployment can be completed within maintenance window
   - [ ] Application is compatible with database changes
   - [ ] Rollback plan is documented and tested
