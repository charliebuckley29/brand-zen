import { CursorMonitoringPanel } from '@/components/CursorMonitoringPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CursorMonitoringPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Cursor Monitoring</h1>
            <p className="text-muted-foreground">
              Monitor API cursor continuity and pagination state across all users and brands
            </p>
          </div>
        </div>

        {/* Cursor Monitoring Panel */}
        <CursorMonitoringPanel />
      </div>
    </div>
  );
}






