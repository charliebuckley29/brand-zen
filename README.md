# Brand Zen - Brand Monitoring Platform

A comprehensive brand monitoring and sentiment analysis platform built with React, TypeScript, and Supabase. Track mentions across multiple sources, analyze sentiment, and get real-time alerts for your brand.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- AWS Amplify account (for deployment)

### Installation

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
   Fill in your Supabase credentials and other API keys.

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8081`

## 📁 Project Structure

```
brand-zen/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components (shadcn/ui)
│   │   ├── ErrorBoundaries.tsx
│   │   ├── VirtualizedMentionsTable.tsx
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Main dashboard
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useOptimizedQueries.ts
│   │   ├── usePerformance.ts
│   │   └── ...
│   ├── store/              # Zustand state management
│   │   ├── appStore.ts
│   │   ├── dataStore.ts
│   │   └── performanceStore.tsx
│   ├── services/           # API and data services
│   │   └── dataService.ts
│   ├── lib/                # Utilities and helpers
│   │   ├── logger.ts
│   │   ├── errorHandler.ts
│   │   └── utils.ts
│   ├── integrations/       # External service integrations
│   │   ├── supabase/
│   │   └── aws/
│   ├── contexts/           # React contexts
│   └── types/              # TypeScript type definitions
├── supabase/               # Supabase configuration
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── docs/                   # Documentation
└── aws/                    # AWS Lambda functions
```

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React Query** for data fetching and caching
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Supabase** for database and authentication
- **Supabase Edge Functions** for serverless functions
- **AWS Lambda** for external API integrations

### Key Features
- 🔍 **Multi-source monitoring** (News, Reddit, YouTube, Web)
- 📊 **Real-time sentiment analysis**
- 🚨 **Smart alerting system**
- 📈 **Analytics and reporting**
- 👥 **User management and roles**
- 🛡️ **Comprehensive error handling**
- ⚡ **Performance optimization**

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Supabase
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:studio  # Open Supabase Studio
npm run db:diff          # Compare local and remote schemas
npm run db:pull          # Pull remote schema changes
npm run db:push          # Push local schema changes

# Code Quality
npm run lint             # Run ESLint
```

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Code formatting (recommended)
- **Conventional Commits**: Use conventional commit messages

### State Management

The application uses **Zustand** for state management with three main stores:

- `appStore`: Global app state (user, theme, navigation)
- `dataStore`: Data-related state (mentions, notifications, analytics)
- `performanceStore`: Performance monitoring and metrics

### Error Handling

- **Error Boundaries**: Catch React component errors
- **Global Error Handler**: Centralized error processing
- **Error Monitoring Dashboard**: Real-time error tracking (admin only)
- **Logging System**: Structured logging with different levels

## 🚀 Deployment

### AWS Amplify

The application is configured for deployment on AWS Amplify:

1. Connect your GitHub repository to Amplify
2. Configure environment variables in Amplify console
3. Deploy automatically on push to main branch

### Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Developer Guide](./docs/development.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [Troubleshooting Guide](./docs/troubleshooting.md)
- Review the [Developer Guide](./docs/development.md)
- Open an issue on GitHub

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.