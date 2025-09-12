# Deployment Guide

## Overview

Brand Zen is deployed on AWS Amplify with Supabase as the backend. This guide covers the complete deployment process from development to production.

## Prerequisites

### Required Accounts

1. **AWS Account** - For Amplify hosting and Lambda functions
2. **Supabase Account** - For database and authentication
3. **GitHub Account** - For source control and CI/CD

### Required Tools

- **AWS CLI** - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Supabase CLI** - [Installation Guide](https://supabase.com/docs/guides/cli)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

## Environment Setup

### 1. Supabase Setup

#### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Choose organization and enter project details
4. Select region and database password
5. Wait for project creation to complete

#### Get Supabase Credentials

```bash
# Get project URL and anon key from Supabase dashboard
# Go to Settings > API > Project URL and anon public key
```

#### Set up Database Schema

```bash
# Link to remote project
supabase link --project-ref your-project-ref

# Pull remote schema
supabase db pull

# Apply migrations
supabase db push
```

### 2. AWS Setup

#### Create IAM User

1. Go to AWS IAM Console
2. Create new user with programmatic access
3. Attach policies:
   - `AmplifyFullAccess`
   - `LambdaFullAccess`
   - `S3FullAccess`

#### Configure AWS CLI

```bash
aws configure
# Enter Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

### 3. Environment Variables

Create environment files for different stages:

#### Development (.env.local)
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENV=development
```

#### Production (.env.production)
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENV=production
```

## Deployment Process

### 1. Frontend Deployment (AWS Amplify)

#### Connect Repository

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New App" > "Host web app"
3. Connect your GitHub repository
4. Select the main branch

#### Configure Build Settings

The `amplify.yml` file is already configured:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### Set Environment Variables

In Amplify Console:
1. Go to App Settings > Environment Variables
2. Add the following variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV=production`

#### Deploy

```bash
# Push to main branch triggers automatic deployment
git add .
git commit -m "feat: deploy to production"
git push origin main
```

### 2. Backend Deployment (Supabase)

#### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy automated-mention-fetch

# Deploy with secrets
supabase secrets set API_KEY=your-api-key
supabase functions deploy automated-mention-fetch
```

#### Set up Database

```bash
# Apply migrations
supabase db push

# Set up RLS policies
supabase db push --include-all

# Seed initial data (if needed)
supabase db seed
```

### 3. Lambda Functions (AWS)

#### Deploy Lambda Functions

```bash
# Build and deploy each Lambda function
cd aws/lambdas/analyzeMention
npm install
zip -r function.zip .
aws lambda update-function-code --function-name analyzeMention --zip-file fileb://function.zip

cd ../enqueueMention
npm install
zip -r function.zip .
aws lambda update-function-code --function-name enqueueMention --zip-file fileb://function.zip
```

#### Configure Lambda Environment

```bash
# Set environment variables for each Lambda
aws lambda update-function-configuration \
  --function-name analyzeMention \
  --environment Variables='{
    "SUPABASE_URL":"https://your-project-ref.supabase.co",
    "SUPABASE_SERVICE_KEY":"your-service-key"
  }'
```

## Production Configuration

### 1. Supabase Production Setup

#### Enable RLS Policies

```sql
-- Ensure all tables have RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create production policies
CREATE POLICY "Users can view own data" ON profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mentions" ON mentions
  FOR SELECT USING (auth.uid() = user_id);
```

#### Set up Monitoring

```sql
-- Create monitoring tables
CREATE TABLE api_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  api_source VARCHAR(50) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  response_status INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  calls_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. AWS Production Setup

#### Configure CloudFront

1. Go to CloudFront Console
2. Create distribution for Amplify app
3. Configure caching rules
4. Set up custom domain (optional)

#### Set up Monitoring

```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "Amplify-Build-Failures" \
  --alarm-description "Amplify build failures" \
  --metric-name "BuildFailures" \
  --namespace "AWS/Amplify" \
  --statistic "Sum" \
  --period 300 \
  --threshold 1 \
  --comparison-operator "GreaterThanOrEqualToThreshold"
```

### 3. Security Configuration

#### Supabase Security

```sql
-- Create admin role
CREATE ROLE admin_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;

-- Assign admin role to admin users
UPDATE profiles 
SET role = 'admin' 
WHERE email IN ('admin@yourcompany.com');
```

#### AWS Security

```bash
# Create IAM policy for Lambda functions
aws iam create-policy \
  --policy-name "BrandZenLambdaPolicy" \
  --policy-document file://lambda-policy.json
```

## Monitoring and Maintenance

### 1. Application Monitoring

#### Supabase Monitoring

- **Database Performance**: Monitor query performance in Supabase Dashboard
- **Edge Function Logs**: Check function execution logs
- **API Usage**: Monitor API calls and rate limits

#### AWS Monitoring

- **Amplify Builds**: Monitor build status and performance
- **Lambda Metrics**: Track function invocations and errors
- **CloudWatch Logs**: Centralized logging for all services

### 2. Performance Optimization

#### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_mentions_user_id_created_at ON mentions(user_id, created_at);
CREATE INDEX idx_mentions_sentiment ON mentions(sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, read);
```

#### Frontend Optimization

```typescript
// Enable code splitting
const AdminPanel = lazy(() => import('./AdminPanel'));

// Configure caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
    },
  },
});
```

### 3. Backup and Recovery

#### Database Backups

```bash
# Supabase automatically handles backups
# For additional backups, use pg_dump
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > backup.sql
```

#### Code Backups

```bash
# GitHub provides automatic backups
# For additional security, mirror to another Git provider
git remote add mirror https://gitlab.com/your-username/brand-zen.git
git push mirror main
```

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: Amplify build fails
```bash
# Check build logs in Amplify Console
# Common causes:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
```

**Solution**:
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run lint

# Verify environment variables
echo $VITE_SUPABASE_URL
```

#### Database Connection Issues

**Issue**: Cannot connect to Supabase
```bash
# Check Supabase status
supabase status

# Verify credentials
supabase projects list
```

**Solution**:
```bash
# Re-link project
supabase link --project-ref your-project-ref

# Check network connectivity
ping db.your-project-ref.supabase.co
```

#### Edge Function Errors

**Issue**: Edge functions not working
```bash
# Check function logs
supabase functions logs function-name

# Test function locally
supabase functions serve
```

**Solution**:
```bash
# Redeploy function
supabase functions deploy function-name

# Check function configuration
supabase functions list
```

### Performance Issues

#### Slow Database Queries

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM mentions WHERE user_id = 'user-id';
```

#### High API Usage

```bash
# Check API usage in Supabase Dashboard
# Monitor rate limits
# Implement caching strategies
```

## Scaling Considerations

### Horizontal Scaling

#### Database Scaling

- **Read Replicas**: Set up read replicas for read-heavy operations
- **Connection Pooling**: Use PgBouncer for connection management
- **Partitioning**: Partition large tables by date or user

#### Application Scaling

- **CDN**: Use CloudFront for static assets
- **Caching**: Implement Redis for session and data caching
- **Load Balancing**: Use Application Load Balancer for multiple instances

### Vertical Scaling

#### Database Resources

- **Upgrade Plan**: Move to higher Supabase plan
- **CPU/Memory**: Increase database resources
- **Storage**: Add more storage as needed

#### Application Resources

- **Lambda Memory**: Increase Lambda memory allocation
- **Amplify Resources**: Upgrade Amplify plan
- **Edge Function Limits**: Increase function timeout and memory

## Security Best Practices

### 1. Environment Security

```bash
# Never commit secrets to Git
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Use AWS Secrets Manager for sensitive data
aws secretsmanager create-secret \
  --name "brand-zen/api-keys" \
  --secret-string '{"gnews":"key","reddit":"key"}'
```

### 2. Database Security

```sql
-- Enable audit logging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit table
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. API Security

```typescript
// Implement rate limiting
const rateLimiter = new Map();

const checkRateLimit = (ip: string, limit: number = 100) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const userLimit = rateLimiter.get(ip);
  if (now > userLimit.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
};
```

## Maintenance Schedule

### Daily Tasks

- [ ] Check application health
- [ ] Monitor error rates
- [ ] Review API usage

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Check database growth
- [ ] Update dependencies

### Monthly Tasks

- [ ] Security audit
- [ ] Backup verification
- [ ] Cost optimization review

### Quarterly Tasks

- [ ] Full security review
- [ ] Performance optimization
- [ ] Disaster recovery testing
