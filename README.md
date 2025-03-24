# Rekreativ Business Management System

A comprehensive business management application for handling clients, machines, collections, expenses, and more.

## Tech Stack

- **Frontend**: React, TypeScript, Redux Toolkit, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Realtime)
- **Build Tool**: Vite

## Features

- Client management
- Machine inventory and tracking
- Collection tracking
- Expense management
- User authentication and permissions
- Maintenance scheduling
- Reporting and analytics
- Offline support
- Real-time updates

## Setup and Development

### Prerequisites

- Node.js 16+
- npm 7+

### Local Development

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd rekreativ
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`
   ```bash
   cp supabase/env.example .env
   ```

4. Add your Supabase details to the `.env` file
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

### Database Setup

1. Create a new Supabase project in the dashboard
2. Make sure you've already created your project and have your URL and anon key
3. **Important:** Run the migrations in the correct order:

   ```bash
   # First enable the required extensions before any other migrations
   psql -h YOUR_SUPABASE_DB_HOST -p 5432 -U postgres -d postgres -f supabase/migrations/000_enable_extensions.sql
   
   # Then run the remaining migrations in order
   psql -h YOUR_SUPABASE_DB_HOST -p 5432 -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
   psql -h YOUR_SUPABASE_DB_HOST -p 5432 -U postgres -d postgres -f supabase/migrations/002_authentication_setup.sql
   # ... and so on
   ```

   Alternatively, you can use the included script (requires setting SUPABASE_DB_URL environment variable):
   ```bash
   node scripts/run-migrations.js
   ```

## Troubleshooting Common Issues

### "operator class 'gin_trgm_ops' does not exist for access method 'gin'"

This error occurs when trying to create GIN indexes with the trigram operator class before enabling the pg_trgm extension.
Make sure you run the `000_enable_extensions.sql` migration **first** before any other migrations.

### Authentication Issues

If you encounter authentication issues, check:
1. Your environment variables are correctly set
2. You've properly set up auth policies in Supabase
3. Your Supabase project has the auth service enabled

### Connection Issues

If you can't connect to your Supabase database:
1. Check firewall settings
2. Verify your IP is allowed in Supabase dashboard
3. Confirm your database credentials are correct

## Architecture

### Data Flow
- Redux for state management
- RTK Query for API communications (optional)
- Supabase for real-time data synchronization

### Authentication
- Supabase Auth for user authentication
- Role-based access control (Admin, Technician)

### Database
- PostgreSQL with Row Level Security (RLS)
- Realtime enabled for key tables

## Deployment

### Production Build
```bash
npm run build
```

The output will be in the `dist` directory.

### Supabase Configuration
- Enable required Supabase services (Auth, Storage, Realtime)
- Apply all migrations
- Set up appropriate access controls
- Configure backups and monitoring

## Contributing

### Code Style
- ESLint for code linting
- Prettier for code formatting

### Git Workflow
- Feature branches
- Pull requests for code reviews
- Semantic versioning

## License

This project is licensed under the [MIT License](LICENSE.md).
