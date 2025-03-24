/**
 * Simple script to execute Supabase migrations in the correct order
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const DB_USER = 'postgres';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Validate configuration
if (!SUPABASE_DB_URL) {
  console.error('SUPABASE_DB_URL environment variable is not set');
  process.exit(1);
}

// Get all migration files
const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
  .filter(file => file.endsWith('.sql') && !file.includes('_rollback'))
  .sort(); // This ensures alphabetical order, which works with our numeric prefixes

console.log('Found migration files:');
migrationFiles.forEach(file => console.log(` - ${file}`));
console.log('');

// Execute each migration
for (const file of migrationFiles) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  console.log(`Executing migration: ${file}...`);
  
  try {
    execSync(`psql ${SUPABASE_DB_URL} -U ${DB_USER} -f "${filePath}"`, {
      stdio: 'inherit'
    });
    console.log(`✅ Successfully applied migration: ${file}`);
  } catch (error) {
    console.error(`❌ Failed to apply migration: ${file}`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log('All migrations completed successfully!');
