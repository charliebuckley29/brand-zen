import { useState, useEffect } from 'react';
import { useRealTimeData } from './useRealTimeData';
import { toast } from 'sonner';

export function useNotifications() {
  const { data, getCriticalAlerts } = useRealTimeData();
  const [processedAlerts, setProcessedAlerts] = useState<Set<string>>(new Set());
  const [notificationSettings, setNotificationSettings] = useState({
    showQueueErrors: true,
    showSystemAlerts: true,
    showRecoveryActions: true,
    showCriticalOnly: false
  });

  useEffect(() => {
    if (!data.alerts.length) return;

    data.alerts.forEach(alert => {
      if (!processedAlerts.has(alert.id)) {
        // Check notification settings
        if (notificationSettings.showCriticalOnly && alert.severity !== 'critical') {
          return;
        }

        // Show toast notification based on alert type
        let shouldShow = false;
        let toastVariant: 'default' | 'destructive' | 'success' = 'default';

        switch (alert.type) {
          case 'queue_error':
            shouldShow = notificationSettings.showQueueErrors;
            toastVariant = 'destructive';
            break;
          case 'system_alert':
            shouldShow = notificationSettings.showSystemAlerts;
            toastVariant = alert.severity === 'critical' ? 'destructive' : 'default';
            break;
          case 'recovery_action':
            shouldShow = notificationSettings.showRecoveryActions;
            toastVariant = 'success';
            break;
          default:
            shouldShow = true;
            toastVariant = alert.severity === 'critical' ? 'destructive' : 'default';
        }

        if (shouldShow) {
          // Show toast notification
          toast(alert.title, {
            description: alert.message,
            variant: toastVariant,
            duration: alert.severity === 'critical' ? 0 : 5000, // Critical alerts don't auto-dismiss
            action: {
              label: 'View Details',
              onClick: () => {
                // Could open a detailed view or scroll to the alert
                console.log('View alert details:', alert);
              }
            }
          });
        }

        setProcessedAlerts(prev => new Set([...prev, alert.id]));
      }
    });
  }, [data.alerts, processedAlerts, notificationSettings]);

  // Clear specific alert
  const clearAlert = (alertId: string) => {
    setProcessedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.delete(alertId);
      return newSet;
    });
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    setProcessedAlerts(new Set());
  };

  // Update notification settings
  const updateNotificationSettings = (settings: Partial<typeof notificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...settings }));
  };

  // Get unread alerts count
  const getUnreadAlertsCount = () => {
    return data.alerts.filter(alert => !processedAlerts.has(alert.id)).length;
  };

  // Get critical alerts count
  const getCriticalAlertsCount = () => {
    return getCriticalAlerts().filter(alert => !processedAlerts.has(alert.id)).length;
  };

  // Get recent alerts (last 10)
  const getRecentAlerts = () => {
    return data.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  };

  // Get alerts by severity
  const getAlertsBySeverity = (severity: string) => {
    return data.alerts.filter(alert => alert.severity === severity);
  };

  // Get alerts by type
  const getAlertsByType = (type: string) => {
    return data.alerts.filter(alert => alert.type === type);
  };

  return {
    alerts: data.alerts,
    processedAlerts,
    notificationSettings,
    clearAlert,
    clearAllAlerts,
    updateNotificationSettings,
    getUnreadAlertsCount,
    getCriticalAlertsCount,
    getRecentAlerts,
    getAlertsBySeverity,
    getAlertsByType,
    getCriticalAlerts
  };
}
