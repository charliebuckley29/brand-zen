import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "0.0.0.0",  // Listen on all IPv4 interfaces explicitly
    port: 8080,
    watch: {
      usePolling: true,
      interval: 1000,  // Poll every 1000 ms (1 second)
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production build optimizations
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: mode === 'development',
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    
    // Asset optimization
    assetsInlineLimit: 4096, // 4kb
    cssCodeSplit: true,
    
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
  },
  
  // Development optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
  },
  
  // CSS optimization
  css: {
    devSourcemap: mode === 'development',
  },
}));

// This configuration sets up a Vite project with React and SWC, enabling component tagging in development mode.
// It also configures the server to listen on all IPv4 interfaces and sets up an alias for the source directory.