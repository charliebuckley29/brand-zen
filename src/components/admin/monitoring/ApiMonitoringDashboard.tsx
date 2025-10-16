import { useState } from "react";
import { Button } from "../../ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useApiMonitoring } from "../../../hooks/useApiMonitoring";
import { apiSources, getSourceConfig } from "../../../lib/api-monitoring-utils";
import { SourceMonitoringCard } from "./SourceMonitoringCard";
import { SystemOverviewCard } from "./SystemOverviewCard";
import { AlertsAndRecommendationsCard } from "./AlertsAndRecommendationsCard";

export function ApiMonitoringDashboard() {
  const { dashboardData, loading, refreshing, refetch } = useApiMonitoring();
  const [activeSource, setActiveSource] = useState<string>('youtube');

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading API health data...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load monitoring data.</p>
        <Button onClick={() => refetch(true)} variant="outline" className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const currentSource = getSourceConfig(activeSource);
  const sourceHealth = dashboardData.health.sources.find(s => s.source === activeSource);
  const sourceAnalytics = dashboardData.analytics.last24Hours.find(s => s.source === activeSource);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button 
            onClick={() => refetch(true)} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link to="/admin/monitoring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Button>
          </Link>
        </div>
      </div>

      {/* Source Tabs */}
      <div className="border-b">
        <div className="flex flex-wrap gap-2">
          {apiSources.map((source) => {
            const Icon = source.icon;
            const isActive = activeSource === source.id;
            const sourceHealth = dashboardData.health.sources.find(s => s.source === source.id);
            const healthColor = sourceHealth?.healthy ? 'bg-green-500' : sourceHealth ? 'bg-red-500' : 'bg-gray-500';
            
            return (
              <Button
                key={source.id}
                variant={isActive ? "default" : "ghost"}
                onClick={() => setActiveSource(source.id)}
                className="flex items-center gap-2 px-4 py-2"
              >
                <Icon className={`w-4 h-4 ${source.color}`} />
                <span>{source.name}</span>
                <div className={`w-2 h-2 rounded-full ${healthColor}`}></div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Current Source Monitoring */}
      <SourceMonitoringCard
        sourceId={activeSource}
        sourceName={currentSource.name}
        sourceIcon={currentSource.icon}
        sourceColor={currentSource.color}
        health={sourceHealth}
        analytics={sourceAnalytics}
      />

      {/* Source-specific Alerts */}
      <AlertsAndRecommendationsCard 
        dashboardData={dashboardData} 
        sourceFilter={activeSource}
      />

      {/* Overall System Overview */}
      <SystemOverviewCard dashboardData={dashboardData} />
    </div>
  );
}
