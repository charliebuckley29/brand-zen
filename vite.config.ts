import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
}));

// This configuration sets up a Vite project with React and SWC, enabling component tagging in development mode.
// It also configures the server to listen on all IPv4 interfaces and sets up an alias for the source directory.