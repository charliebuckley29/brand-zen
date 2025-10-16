import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "../../ui/enhanced-card";
import { Badge } from "../../ui/badge";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { ApiSourceHealth, ApiSourceAnalytics } from "../../../types/api-monitoring";
import { getHealthStatus } from "../../../lib/api-monitoring-utils";
import { ErrorDisplay } from "./ErrorDisplay";

interface SourceMonitoringCardProps {
  sourceId: string;
  sourceName: string;
  sourceIcon: React.ComponentType<{ className?: string }>;
  sourceColor: string;
  health?: ApiSourceHealth;
  analytics?: ApiSourceAnalytics;
}

export function SourceMonitoringCard({
  sourceId,
  sourceName,
  sourceIcon: SourceIcon,
  sourceColor,
  health,
  analytics
}: SourceMonitoringCardProps) {
  const healthStatus = health ? getHealthStatus(health.healthy ? 'healthy' : 'unhealthy') : getHealthStatus('unknown');

  return (
    <EnhancedCard variant="outlined">
      <EnhancedCardHeader>
        <EnhancedCardTitle className="flex items-center gap-2">
          <SourceIcon className={`w-5 h-5 ${sourceColor}`} />
          {sourceName} API Monitoring
          <Badge 
            variant="outline" 
            className={`ml-auto ${
              health?.healthy 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-red-100 text-red-800 border-red-200'
            }`}
          >
            {health?.healthy ? 'Healthy' : health ? 'Issues Detected' : 'No Data'}
          </Badge>
        </EnhancedCardTitle>
      </EnhancedCardHeader>
      <EnhancedCardContent>
        <div className="space-y-6">
          {/* Health Status */}
          {health && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Health Status
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    health.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {health.healthy ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {health.healthy ? 'Healthy' : 'Issues Detected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Response Time</span>
                  <span className="font-mono">{health.responseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Checked</span>
                  <span className="text-xs">
                    {new Date(health.lastChecked).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quota Used</span>
                  <span>{health.quotaUsed || 'N/A'}</span>
                </div>
              </div>
              
              {health.error && (
                <div className="mt-4">
                  <ErrorDisplay error={health.error} />
                </div>
              )}
            </div>
          )}

          {/* Performance Metrics */}
          {analytics && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance Metrics (24h)
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{analytics.performance.totalCalls}</div>
                  <div className="text-xs text-muted-foreground">Total Calls</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {(analytics.performance.successRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">{analytics.results.totalMentions}</div>
                  <div className="text-xs text-muted-foreground">Mentions Found</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {Math.round(analytics.performance.averageResponseTime)}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Response</div>
                </div>
              </div>
            </div>
          )}

          {/* Results Breakdown */}
          {analytics && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Results Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>No Results</span>
                  <span className="font-medium">{analytics.results.noResultsCalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Low Results (1-5)</span>
                  <span className="font-medium">{analytics.results.lowResultCalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Medium Results (6-10)</span>
                  <span className="font-medium">{analytics.results.mediumResultCalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>High Results (&gt;10)</span>
                  <span className="font-medium">{analytics.results.highResultCalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avg Mentions/Call</span>
                  <span className="font-medium">{analytics.results.averageMentionsPerCall.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Analysis */}
          {analytics && analytics.errors.totalErrors > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Error Analysis
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total Errors</span>
                  <span className="font-medium text-red-600">{analytics.errors.totalErrors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rate Limit</span>
                  <span className="font-medium">{analytics.errors.rateLimit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network</span>
                  <span className="font-medium">{analytics.errors.network}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Timeout</span>
                  <span className="font-medium">{analytics.errors.timeout}</span>
                </div>
              </div>
            </div>
          )}

          {/* No Data State */}
          {!health && !analytics && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                No monitoring data available for {sourceName} in the last 24 hours.
              </p>
            </div>
          )}
        </div>
      </EnhancedCardContent>
    </EnhancedCard>
  );
}
