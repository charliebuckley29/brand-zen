# Brand Zen Frontend

React-based frontend application for the Brand Zen brand monitoring platform, hosted on AWS Amplify.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- AWS Amplify account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and other API keys.

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:8081`

## 📁 Project Structure

```
frontend/
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
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── amplify.yml             # AWS Amplify configuration
└── README.md               # This file
```

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React Query** for data fetching and caching
- **Zustand** for state management
- **React Router** for navigation

### State Management

**Zustand Stores:**

1. **AppStore** (`src/store/appStore.ts`)
   - User authentication state
   - Theme preferences
   - Navigation state
   - Global UI state

2. **DataStore** (`src/store/dataStore.ts`)
   - Mentions data
   - Notifications
   - Analytics data
   - Search filters

3. **PerformanceStore** (`src/store/performanceStore.tsx`)
   - Performance metrics
   - Error tracking
   - Monitoring data

### Data Fetching

**React Query Integration:**
- Centralized data fetching with `useOptimizedQueries.ts`
- Automatic caching and background updates
- Optimistic updates
- Error handling and retry logic

**Data Service Layer:**
- `dataService.ts` abstracts all Supabase operations
- Consistent error handling
- Type-safe API calls

### Performance Optimizations

1. **Data Virtualization**
   - `react-window` for large lists
   - VirtualizedMentionsTable for mentions
   - VirtualizedNotificationsList for notifications

2. **Code Splitting**
   - Vite automatic code splitting
   - Route-based lazy loading
   - Dynamic imports for heavy components

3. **Caching Strategy**
   - React Query for API caching
   - Zustand for client-side state
   - Local storage for user preferences

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
```

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Code formatting (recommended)
- **Conventional Commits**: Use conventional commit messages

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

- [Architecture Overview](../docs/architecture.md)
- [API Documentation](../docs/api.md)
- [Deployment Guide](../docs/deployment.md)
- [Developer Guide](../docs/development.md)
- [Troubleshooting](../docs/troubleshooting.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
