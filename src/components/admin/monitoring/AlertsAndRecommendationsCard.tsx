import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "../../ui/enhanced-card";
import { Badge } from "../../ui/badge";
import { DashboardData } from "../../../types/api-monitoring";
import { getSeverityColor } from "../../../lib/api-monitoring-utils";
import { AlertTriangle, Info } from "lucide-react";

interface AlertsAndRecommendationsCardProps {
  dashboardData: DashboardData;
  sourceFilter?: string; // Optional filter for specific source
}

export function AlertsAndRecommendationsCard({ 
  dashboardData, 
  sourceFilter 
}: AlertsAndRecommendationsCardProps) {
  const filteredAlerts = sourceFilter 
    ? dashboardData.alerts.filter(alert => alert.source === sourceFilter || alert.source === 'global')
    : dashboardData.alerts;

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {filteredAlerts.length > 0 && (
        <EnhancedCard variant="outlined">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts{sourceFilter && ` for ${sourceFilter}`}
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75 mt-1">
                        {alert.source} • {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      )}

      {/* Recommendations */}
      {dashboardData.recommendations.length > 0 && (
        <EnhancedCard variant="outlined">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Recommendations
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="space-y-2">
              {dashboardData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      )}

      {/* No Alerts State */}
      {filteredAlerts.length === 0 && dashboardData.recommendations.length === 0 && (
        <EnhancedCard variant="outlined" className="text-center py-8">
          <EnhancedCardContent>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Info className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">All Systems Healthy</h3>
              <p className="text-muted-foreground">
                No active alerts or recommendations at this time.
              </p>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      )}
    </div>
  );
}
