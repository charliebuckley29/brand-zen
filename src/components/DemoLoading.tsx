
import { RefreshCw } from "lucide-react";

export function DemoLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin" />
          <div className="absolute inset-0 w-12 h-12 mx-auto border-2 border-primary/20 rounded-full animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Loading Demo Dashboard
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Preparing sample brand monitoring data for demonstration...
          </p>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        </div>
        
        <div className="bg-muted/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground">
            This demo includes sample mentions, analytics, and interactive features
          </p>
        </div>
      </div>
    </div>
  );
}
