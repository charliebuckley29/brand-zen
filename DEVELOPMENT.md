# Brand Zen - Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase CLI
- Git

### Setup
1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd brand-zen
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start local development:**
   ```bash
   # Start Supabase locally
   npm run supabase:start
   
   # Start the frontend
   npm run dev
   ```

## 🗄️ Database Management

### Local Development
```bash
# Start local Supabase
npm run supabase:start

# View database in Studio
npm run supabase:studio

# Reset local database
npm run supabase:reset

# Stop local Supabase
npm run supabase:stop
```

### Schema Changes
```bash
# Check for schema differences
npm run db:diff

# Pull latest schema from remote
npm run db:pull

# Push local changes to remote
npm run db:push
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── types/              # TypeScript type definitions
├── lib/                # Utility functions
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
└── pages/              # Page components

supabase/
├── config.toml         # Supabase configuration
├── seed.sql            # Seed data for local development
└── migrations/         # Database migrations
```

## 🔧 Development Workflow

### 1. Making Schema Changes
1. Make changes in Supabase Studio (local or remote)
2. Generate migration: `npm run db:diff`
3. Review the generated migration file
4. Apply changes: `npm run db:push`

### 2. Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes
3. Test locally with `npm run dev`
4. Create pull request

### 3. Database Seeding
- Local development uses `supabase/seed.sql`
- Add sample data for testing
- Reset database: `npm run supabase:reset`

## 🚀 Deployment

### Frontend (Amplify)
- Automatic deployment on push to main
- Environment variables set in Amplify console
- Build logs available in Amplify console

### Database (Supabase)
- Schema changes via migrations
- Edge functions in `supabase/functions/`
- Deploy functions: `supabase functions deploy`

## 🐛 Troubleshooting

### Common Issues

1. **Supabase connection issues:**
   - Check environment variables
   - Verify Supabase project is active
   - Check network connectivity

2. **Build failures:**
   - Check Amplify build logs
   - Verify all dependencies installed
   - Check for TypeScript errors

3. **Database sync issues:**
   - Run `npm run db:diff` to check differences
   - Use `npm run db:pull` to sync from remote
   - Check migration history

### Getting Help
- Check Supabase documentation
- Review Amplify build logs
- Check browser console for errors
- Use `npm run supabase:status` for local status

## 📊 Performance Monitoring

### Local Development
- Performance monitoring enabled in dev mode
- Check browser dev tools for performance metrics
- Use React DevTools for component analysis

### Production
- Monitor Amplify build times
- Check Supabase query performance
- Use browser dev tools for runtime performance

## 🔒 Security

### Environment Variables
- Never commit `.env.local` to git
- Use Amplify environment variables for production
- Rotate API keys regularly

### Database Security
- Row Level Security (RLS) enabled on all tables
- User-specific data access policies
- Regular security audits recommended
