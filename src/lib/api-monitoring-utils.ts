import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Youtube,
  MessageSquare,
  Twitter,
  AlertCircle,
  Rss,
  Globe
} from "lucide-react";
import { ApiSourceConfig } from "../types/api-monitoring";

export const apiSources: ApiSourceConfig[] = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'reddit', name: 'Reddit', icon: MessageSquare, color: 'text-orange-500' },
  { id: 'x', name: 'X (Twitter)', icon: Twitter, color: 'text-blue-500' },
  { id: 'google_alert', name: 'Google Alerts', icon: AlertCircle, color: 'text-green-500' },
  { id: 'rss_news', name: 'RSS News', icon: Rss, color: 'text-purple-500' }
];

export const getSourceConfig = (sourceId: string): ApiSourceConfig => {
  return apiSources.find(s => s.id === sourceId) || apiSources[0];
};

export const getHealthStatus = (status: string) => {
  switch (status) {
    case 'healthy': return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Healthy' };
    case 'degraded': return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: 'Degraded' };
    case 'unhealthy': return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, label: 'Unhealthy' };
    default: return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock, label: 'Unknown' };
  }
};

export const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getSourceIcon = (source: string) => {
  switch (source) {
    case 'youtube': return Youtube;
    case 'reddit': return MessageSquare;
    case 'x': return Twitter;
    case 'google_alert': return AlertCircle;
    case 'rss_news': return Rss;
    default: return Globe;
  }
};
