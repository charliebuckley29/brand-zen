import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface ApiSource {
  name: string;
  configured: boolean;
  error: string | null;
}

export default function AdminApiStatus() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [sources, setSources] = useState<Record<string, ApiSource>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchApiStatus();
    } else if (!roleLoading && !isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading]);

  const fetchApiStatus = async () => {
    try {
      const response = await fetch('/api/mentions/sources-status');
      const data = await response.json();
      
      if (data.success) {
        setSources(data.sources);
      } else {
        toast.error('Failed to fetch API status');
      }
    } catch (error) {
      console.error('Error fetching API status:', error);
      toast.error('Failed to fetch API status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (source: ApiSource) => {
    if (source.configured) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (source.error) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (source: ApiSource) => {
    if (source.configured) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Configured</Badge>;
    } else {
      return <Badge variant="secondary">Not Configured</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">API Configuration Status</h1>
              <p className="text-muted-foreground">Loading API key status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const configuredCount = Object.values(sources).filter(s => s.configured).length;
  const totalCount = Object.keys(sources).length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">API Configuration Status</h1>
            <p className="text-muted-foreground">
              API keys are now managed via environment variables for security
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
            <Button onClick={fetchApiStatus}>
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Configuration Overview
            </CardTitle>
            <CardDescription>
              {configuredCount} of {totalCount} services configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{configuredCount}</div>
                <div className="text-sm text-green-600">Configured</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{totalCount - configuredCount}</div>
                <div className="text-sm text-yellow-600">Not Configured</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{Math.round((configuredCount / totalCount) * 100)}%</div>
                <div className="text-sm text-blue-600">Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Sources */}
        <Card>
          <CardHeader>
            <CardTitle>API Sources</CardTitle>
            <CardDescription>
              Status of all configured API services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(sources).map(([sourceName, source]) => (
                <div key={sourceName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(source)}
                    <div>
                      <div className="font-medium capitalize">{sourceName}</div>
                      {source.error && (
                        <div className="text-sm text-red-600">{source.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(source)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Configuration Instructions</CardTitle>
            <CardDescription>
              API keys are now managed via environment variables for improved security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Required Environment Variables:</h3>
              <div className="font-mono text-sm space-y-1">
                <div>OPENAI_API_KEY=your_openai_key</div>
                <div>YOUTUBE_API_KEY=your_youtube_key</div>
                <div>APIFY_API_KEY=your_apify_key</div>
                <div>REDDIT_API_KEY=your_reddit_key</div>
                <div>OCTOPARSE_API_KEY=your_octoparse_key</div>
                <div>LOBSTR_API_KEY=your_lobstr_key</div>
                <div>SCRAPERAPI_API_KEY=your_scraperapi_key</div>
                <div>SCRAPINGDOG_API_KEY=your_scrapingdog_key</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="https://vercel.com/docs/environment-variables" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Vercel Environment Variables Guide
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/docs/api-keys-migration" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Migration Documentation
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
