import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../ui/enhanced-card";
import { DashboardData } from "../../../types/api-monitoring";
import { getHealthStatus } from "../../../lib/api-monitoring-utils";
import { Globe, Database, TrendingUp, AlertTriangle } from "lucide-react";

interface SystemOverviewCardProps {
  dashboardData: DashboardData;
}

export function SystemOverviewCard({ dashboardData }: SystemOverviewCardProps) {
  const healthStatus = getHealthStatus(dashboardData.health.overall.status);

  return (
    <EnhancedCard variant="outlined">
      <EnhancedCardHeader>
        <EnhancedCardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Overall System Overview
        </EnhancedCardTitle>
        <EnhancedCardDescription>
          System-wide metrics across all API sources
        </EnhancedCardDescription>
      </EnhancedCardHeader>
      <EnhancedCardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${healthStatus.bg} mb-3`}>
              <healthStatus.icon className={`h-6 w-6 ${healthStatus.color}`} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
            <p className="text-2xl font-bold">{healthStatus.label}</p>
            <p className="text-xs text-muted-foreground">
              {dashboardData.health.overall.score.toFixed(1)}% ({dashboardData.health.overall.healthySources}/{dashboardData.health.overall.totalSources} sources)
            </p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-3">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">API Calls (24h)</p>
            <p className="text-2xl font-bold">{dashboardData.overview.totalApiCalls.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {(dashboardData.overview.overallSuccessRate * 100).toFixed(1)}% success rate
            </p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 mb-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Mentions Found</p>
            <p className="text-2xl font-bold">{dashboardData.overview.totalMentionsFound.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {dashboardData.overview.averageResponseTime}ms avg response
            </p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-100 mb-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Active Sources</p>
            <p className="text-2xl font-bold">{dashboardData.overview.activeSources}/{dashboardData.overview.totalSources}</p>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(dashboardData.overview.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </EnhancedCardContent>
    </EnhancedCard>
  );
}
