# Troubleshooting Guide

## Common Issues and Solutions

### Development Issues

#### 1. Build Failures

**Problem**: `npm run build` fails with TypeScript errors

**Symptoms**:
```
error TS2304: Cannot find name 'React'
error TS2339: Property 'useState' does not exist on type 'typeof React'
```

**Solution**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Install missing dependencies
npm install @types/react @types/react-dom

# Check tsconfig.json
cat tsconfig.json
```

**Prevention**:
- Always install type definitions for new packages
- Use `npm install @types/package-name` for TypeScript support
- Run `npm run lint` before committing

---

#### 2. Supabase Connection Issues

**Problem**: Cannot connect to Supabase database

**Symptoms**:
```
Error: Invalid API key
Error: Failed to fetch
Error: Network error
```

**Solution**:
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Verify Supabase project status
supabase status

# Test connection
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
     "$VITE_SUPABASE_URL/rest/v1/"
```

**Prevention**:
- Always verify environment variables are set
- Check Supabase project is active
- Use correct API keys (anon vs service)

---

#### 3. Hot Module Replacement (HMR) Not Working

**Problem**: Changes not reflecting in browser

**Symptoms**:
- Browser doesn't refresh on file changes
- Console shows "HMR update" but UI doesn't change

**Solution**:
```bash
# Restart development server
npm run dev

# Clear Vite cache
rm -rf node_modules/.vite

# Check file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Prevention**:
- Avoid editing files outside the project directory
- Don't use symlinks in the project
- Keep file paths under 260 characters (Windows)

---

#### 4. Memory Issues During Development

**Problem**: Development server crashes with memory errors

**Symptoms**:
```
FATAL ERROR: Ineffective mark-compacts near heap limit
JavaScript heap out of memory
```

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# Or set in package.json
"dev": "NODE_OPTIONS='--max-old-space-size=4096' vite"
```

**Prevention**:
- Close unused browser tabs
- Restart development server periodically
- Use `--max-old-space-size` flag for large projects

---

### Runtime Issues

#### 1. Authentication Problems

**Problem**: Users cannot log in or get logged out unexpectedly

**Symptoms**:
- Login form shows "Invalid credentials"
- Users get redirected to login page
- "Session expired" errors

**Solution**:
```typescript
// Check authentication state
const { data: { user }, error } = await supabase.auth.getUser();

if (error) {
  console.error('Auth error:', error);
  // Handle error appropriately
}

// Check session validity
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
  navigate('/login');
}
```

**Debugging**:
```bash
# Check Supabase auth logs
supabase functions logs

# Verify JWT token
jwt.io  # Paste token to decode
```

**Prevention**:
- Implement proper error handling for auth
- Set appropriate session timeouts
- Handle token refresh automatically

---

#### 2. Data Not Loading

**Problem**: Mentions, notifications, or other data not appearing

**Symptoms**:
- Empty lists in UI
- Loading spinners never stop
- Console shows API errors

**Solution**:
```typescript
// Check React Query cache
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
console.log('Cache:', queryClient.getQueryCache());

// Check network requests
// Open browser DevTools > Network tab
// Look for failed requests (red status codes)

// Verify API calls
const { data, error, isLoading } = useQuery({
  queryKey: ['mentions'],
  queryFn: () => dataService.fetchMentions(/* params */),
  onError: (error) => {
    console.error('Query error:', error);
  }
});
```

**Debugging**:
```bash
# Check Supabase logs
supabase functions logs automated-mention-fetch

# Test API directly
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
     "$VITE_SUPABASE_URL/rest/v1/mentions?select=*"
```

---

#### 3. Performance Issues

**Problem**: Application is slow or unresponsive

**Symptoms**:
- Slow page loads
- UI freezes during interactions
- High memory usage

**Solution**:
```typescript
// Check for memory leaks
// Use React DevTools Profiler
// Look for components that don't unmount

// Optimize re-renders
const MemoizedComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

**Debugging**:
```bash
# Check bundle size
npm run build
# Look for large chunks in build output

# Profile performance
# Use Chrome DevTools > Performance tab
# Record a session and analyze
```

---

#### 4. Error Boundary Issues

**Problem**: Errors not being caught by error boundaries

**Symptoms**:
- White screen of death
- Unhandled errors in console
- App crashes completely

**Solution**:
```typescript
// Ensure error boundaries are properly set up
<ErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</ErrorBoundary>

// Check error boundary implementation
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }
}
```

**Debugging**:
```bash
# Check error logs
# Look in browser console for uncaught errors
# Check error monitoring dashboard (admin panel)
```

---

### Database Issues

#### 1. RLS Policy Problems

**Problem**: Users cannot access their data due to RLS policies

**Symptoms**:
- "Permission denied" errors
- Empty results for valid queries
- Inconsistent data access

**Solution**:
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'mentions';

-- Test policy with specific user
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid"}';
SELECT * FROM mentions WHERE user_id = 'user-uuid';
```

**Debugging**:
```bash
# Check Supabase logs
supabase functions logs

# Test policies in Supabase Studio
# Go to Authentication > Policies
# Test with different user roles
```

---

#### 2. Query Performance Issues

**Problem**: Database queries are slow

**Symptoms**:
- Long loading times
- Timeout errors
- High database CPU usage

**Solution**:
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Analyze specific query
EXPLAIN ANALYZE SELECT * FROM mentions 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 10;

-- Create missing indexes
CREATE INDEX idx_mentions_user_id_created_at 
ON mentions(user_id, created_at DESC);
```

**Prevention**:
- Always use indexes on filtered columns
- Limit result sets with pagination
- Use appropriate WHERE clauses

---

#### 3. Migration Issues

**Problem**: Database migrations fail or cause data loss

**Symptoms**:
- Migration errors
- Data inconsistencies
- Schema mismatches

**Solution**:
```bash
# Check migration status
supabase migration list

# Rollback failed migration
supabase migration repair --status reverted migration_id

# Reset database (development only)
supabase db reset

# Check migration files
ls supabase/migrations/
```

**Prevention**:
- Always backup before migrations
- Test migrations on staging first
- Use transactions for complex migrations

---

### Deployment Issues

#### 1. Amplify Build Failures

**Problem**: AWS Amplify builds fail

**Symptoms**:
- Build status shows "Failed"
- Build logs show errors
- App not accessible

**Solution**:
```bash
# Check build logs in Amplify Console
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies

# Test build locally
npm run build

# Check environment variables
# In Amplify Console > App Settings > Environment Variables
```

**Debugging**:
```bash
# Check build configuration
cat amplify.yml

# Verify package.json scripts
cat package.json | grep scripts -A 10
```

---

#### 2. Edge Function Errors

**Problem**: Supabase Edge Functions not working

**Symptoms**:
- Function calls fail
- Error logs show function issues
- Data not being processed

**Solution**:
```bash
# Check function logs
supabase functions logs function-name

# Test function locally
supabase functions serve
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"test": "data"}'

# Redeploy function
supabase functions deploy function-name
```

**Debugging**:
```bash
# Check function configuration
cat supabase/functions/function-name/index.ts

# Verify secrets are set
supabase secrets list
```

---

#### 3. Environment Variable Issues

**Problem**: Environment variables not available in production

**Symptoms**:
- API calls fail
- Configuration errors
- Missing data

**Solution**:
```bash
# Check Amplify environment variables
# Go to App Settings > Environment Variables

# Verify variable names match code
grep -r "VITE_" src/

# Check Supabase secrets
supabase secrets list
```

**Prevention**:
- Use consistent naming conventions
- Document all required variables
- Test with production-like environment

---

### Performance Issues

#### 1. Slow Initial Load

**Problem**: Application takes too long to load initially

**Symptoms**:
- Long time to first contentful paint
- High bundle size
- Slow network requests

**Solution**:
```typescript
// Implement code splitting
const AdminPanel = lazy(() => import('./AdminPanel'));

// Use dynamic imports
const loadHeavyComponent = async () => {
  const { HeavyComponent } = await import('./HeavyComponent');
  return HeavyComponent;
};

// Optimize bundle size
// Check vite.config.ts for manual chunks
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
```

**Debugging**:
```bash
# Analyze bundle size
npm run build
# Check dist/ folder for large files

# Use webpack-bundle-analyzer
npx vite-bundle-analyzer dist/
```

---

#### 2. Memory Leaks

**Problem**: Application memory usage grows over time

**Symptoms**:
- Browser becomes slow
- High memory usage in DevTools
- Application crashes

**Solution**:
```typescript
// Clean up subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('mentions')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mentions' }, handleNewMention)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);

// Clean up timers
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  return () => clearInterval(timer);
}, []);

// Clean up event listeners
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Debugging**:
```bash
# Use Chrome DevTools Memory tab
# Take heap snapshots
# Look for growing objects
```

---

### Security Issues

#### 1. Authentication Bypass

**Problem**: Users can access data they shouldn't

**Symptoms**:
- Users see other users' data
- Admin functions accessible to regular users
- Unauthorized API access

**Solution**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'mentions';

-- Verify user roles
SELECT user_id, role FROM profiles WHERE user_id = 'user-uuid';

-- Test with different users
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid"}';
SELECT * FROM mentions;
```

**Prevention**:
- Always use RLS policies
- Verify user roles in API calls
- Test with different user accounts

---

#### 2. API Key Exposure

**Problem**: API keys exposed in client-side code

**Symptoms**:
- Keys visible in browser source
- Unauthorized API usage
- Security warnings

**Solution**:
```typescript
// Never expose service keys in client code
// Use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use anon key for client-side operations
// Use service key only in Edge Functions
```

**Prevention**:
- Use different keys for different purposes
- Never commit keys to version control
- Use environment variables for all secrets

---

## Debugging Tools

### Browser DevTools

1. **Console**: Check for errors and warnings
2. **Network**: Monitor API calls and responses
3. **Performance**: Profile application performance
4. **Memory**: Check for memory leaks
5. **Application**: Inspect local storage and cookies

### Supabase Tools

1. **Supabase Studio**: Database management and query testing
2. **Logs**: Function and database logs
3. **Metrics**: Performance and usage metrics
4. **Auth**: User management and authentication

### AWS Tools

1. **Amplify Console**: Build logs and deployment status
2. **CloudWatch**: Application logs and metrics
3. **Lambda Console**: Function logs and configuration

## Getting Help

### Internal Resources

1. **Documentation**: Check this troubleshooting guide
2. **Code Comments**: Read inline code documentation
3. **Error Monitoring**: Check admin error dashboard
4. **Logs**: Review application and server logs

### External Resources

1. **React Documentation**: [react.dev](https://react.dev/)
2. **TypeScript Handbook**: [typescriptlang.org](https://www.typescriptlang.org/docs/)
3. **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
4. **AWS Amplify Docs**: [docs.amplify.aws](https://docs.amplify.aws/)

### Community Support

1. **GitHub Issues**: Report bugs and request features
2. **Stack Overflow**: Search for similar issues
3. **Discord/Slack**: Community support channels
4. **Reddit**: r/reactjs, r/typescript, r/supabase

## Prevention Best Practices

### Code Quality

1. **TypeScript**: Use strict mode and proper typing
2. **ESLint**: Follow linting rules and fix warnings
3. **Testing**: Write unit and integration tests
4. **Code Review**: Have code reviewed before merging

### Monitoring

1. **Error Tracking**: Monitor errors in production
2. **Performance**: Track performance metrics
3. **Usage**: Monitor API usage and limits
4. **Security**: Regular security audits

### Documentation

1. **Code Comments**: Document complex logic
2. **README**: Keep project documentation updated
3. **API Docs**: Document all API endpoints
4. **Troubleshooting**: Update this guide with new issues

### Maintenance

1. **Dependencies**: Keep dependencies updated
2. **Security**: Apply security patches promptly
3. **Backups**: Regular database backups
4. **Monitoring**: Set up alerts for critical issues
