# Developer Guide

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v8 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Supabase CLI** - [Installation Guide](https://supabase.com/docs/guides/cli)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd brand-zen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase locally**
   ```bash
   npm run supabase:start
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Project Structure Deep Dive

### Frontend Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── ErrorBoundaries.tsx
│   ├── VirtualizedMentionsTable.tsx
│   ├── VirtualizedNotificationsList.tsx
│   ├── ErrorMonitoringDashboard.tsx
│   └── ...
├── pages/               # Page components (routes)
│   ├── Index.tsx        # Main dashboard
│   ├── AdminDashboard.tsx
│   ├── AdminMonitoringPanel.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useOptimizedQueries.ts
│   ├── usePerformance.ts
│   ├── useDebounce.ts
│   └── ...
├── store/               # Zustand state management
│   ├── appStore.ts      # Global app state
│   ├── dataStore.ts     # Data-related state
│   └── performanceStore.tsx  # Performance monitoring
├── services/            # API and data services
│   └── dataService.ts   # Centralized data operations
├── lib/                 # Utilities and helpers
│   ├── logger.ts        # Logging system
│   ├── errorHandler.ts  # Error handling
│   └── utils.ts         # General utilities
├── integrations/        # External service integrations
│   ├── supabase/        # Supabase client and types
│   └── aws/             # AWS service integrations
├── contexts/            # React contexts
│   ├── NotificationContext.tsx
│   ├── NavigationContext.tsx
│   └── TimezoneContext.tsx
└── types/               # TypeScript type definitions
    └── index.ts
```

### Backend Structure

```
supabase/
├── migrations/          # Database schema migrations
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240101000001_add_user_profiles.sql
│   └── ...
├── functions/           # Supabase Edge Functions
│   ├── automated-mention-fetch/
│   ├── google-alerts/
│   ├── aggregate-sources/
│   └── ...
└── config.toml         # Supabase configuration
```

## Development Workflow

### Daily Development

1. **Start your development environment**
   ```bash
   # Terminal 1: Start Supabase
   npm run supabase:start
   
   # Terminal 2: Start development server
   npm run dev
   ```

2. **Make your changes**
   - Follow the coding standards (see below)
   - Write tests for new features
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run lint          # Check code quality
   npm run build         # Ensure build works
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature-branch
   ```

### Code Standards

#### TypeScript

- **Strict mode enabled** - All code must be type-safe
- **Explicit return types** for functions
- **Interface definitions** for all data structures
- **No `any` types** - Use proper typing

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
}

const getUser = async (id: string): Promise<User | null> => {
  // Implementation
};

// ❌ Bad
const getUser = async (id: any): Promise<any> => {
  // Implementation
};
```

#### React Components

- **Functional components** with TypeScript
- **Props interfaces** for all components
- **Custom hooks** for reusable logic
- **Error boundaries** for error handling

```typescript
// ✅ Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant, onClick, children }) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

#### State Management

- **Zustand stores** for global state
- **React Query** for server state
- **Local state** for component-specific state
- **Immutable updates** for state changes

```typescript
// ✅ Good - Zustand store
interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### Testing

#### Unit Tests

Create tests for utilities, hooks, and pure functions:

```typescript
// src/lib/__tests__/utils.test.ts
import { formatDate, calculateSentiment } from '../utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-01');
      expect(formatDate(date)).toBe('Jan 1, 2024');
    });
  });
});
```

#### Integration Tests

Test API calls and data flow:

```typescript
// src/services/__tests__/dataService.test.ts
import { dataService } from '../dataService';

describe('dataService', () => {
  it('should fetch mentions', async () => {
    const mentions = await dataService.fetchMentions(1, 10, [], '', null, null, null, 'user-id');
    expect(mentions).toBeDefined();
    expect(Array.isArray(mentions.data)).toBe(true);
  });
});
```

### Database Development

#### Migrations

Create migrations for schema changes:

```sql
-- supabase/migrations/20240101000002_add_mentions_table.sql
CREATE TABLE mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  sentiment INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own mentions" ON mentions
  FOR SELECT USING (auth.uid() = user_id);
```

#### Local Development

```bash
# Start local Supabase
npm run supabase:start

# View database in Supabase Studio
npm run supabase:studio

# Reset local database
npm run supabase:reset

# Pull remote schema changes
npm run db:pull

# Push local changes
npm run db:push
```

### API Development

#### Edge Functions

Create new edge functions:

```typescript
// supabase/functions/new-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { method } = req;
  
  if (method === 'POST') {
    // Handle POST request
    const { data } = await req.json();
    
    // Process data
    const result = await processData(data);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
});
```

#### Testing Edge Functions

```bash
# Test locally
supabase functions serve

# Deploy to remote
supabase functions deploy new-function
```

## Performance Optimization

### Frontend Performance

1. **Code Splitting**
   ```typescript
   // Lazy load heavy components
   const AdminPanel = lazy(() => import('./AdminPanel'));
   ```

2. **Data Virtualization**
   ```typescript
   // Use react-window for large lists
   import { FixedSizeList as List } from 'react-window';
   ```

3. **Memoization**
   ```typescript
   // Memoize expensive calculations
   const expensiveValue = useMemo(() => {
     return calculateExpensiveValue(data);
   }, [data]);
   ```

### Backend Performance

1. **Database Indexing**
   ```sql
   -- Create indexes for frequently queried columns
   CREATE INDEX idx_mentions_user_id ON mentions(user_id);
   CREATE INDEX idx_mentions_created_at ON mentions(created_at);
   ```

2. **Query Optimization**
   ```typescript
   // Use select to limit returned columns
   const { data } = await supabase
     .from('mentions')
     .select('id, content, created_at')
     .eq('user_id', userId);
   ```

## Debugging

### Frontend Debugging

1. **React Developer Tools**
   - Install browser extension
   - Inspect component state and props
   - Profile performance

2. **Error Boundaries**
   ```typescript
   // Components automatically catch errors
   <ErrorBoundary fallback={<ErrorFallback />}>
     <MyComponent />
   </ErrorBoundary>
   ```

3. **Logging**
   ```typescript
   import { logger } from '@/lib/logger';
   
   logger.debug('Debug message');
   logger.info('Info message');
   logger.warn('Warning message');
   logger.error('Error message');
   ```

### Backend Debugging

1. **Supabase Logs**
   ```bash
   # View function logs
   supabase functions logs function-name
   ```

2. **Database Debugging**
   ```sql
   -- Check query performance
   EXPLAIN ANALYZE SELECT * FROM mentions WHERE user_id = 'user-id';
   ```

## Common Issues & Solutions

### Build Issues

**Issue**: TypeScript errors during build
```bash
# Solution: Check types and fix errors
npm run lint
```

**Issue**: Supabase connection errors
```bash
# Solution: Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Runtime Issues

**Issue**: Component not updating
- Check if state is being updated correctly
- Verify React Query cache invalidation
- Check for missing dependencies in useEffect

**Issue**: API calls failing
- Check network tab in browser dev tools
- Verify API endpoints and authentication
- Check Supabase logs

## Contributing

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Follow coding standards
   - Write tests
   - Update documentation

3. **Test your changes**
   ```bash
   npm run lint
   npm run build
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Code Review Guidelines

- **Review for correctness** - Does the code work as intended?
- **Review for performance** - Are there any performance issues?
- **Review for security** - Are there any security vulnerabilities?
- **Review for maintainability** - Is the code easy to understand and maintain?

## Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tools
- [Vite Documentation](https://vitejs.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Learning
- [React Patterns](https://reactpatterns.com/)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Supabase Best Practices](https://supabase.com/docs/guides/database/best-practices)
