import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminStatsCard } from '@/components/admin/shared/AdminStatsCard';
import { AdminStatusBadge } from '@/components/admin/shared/AdminStatusBadge';
import { AdminQuotaManagerV2 } from '@/components/AdminQuotaManagerV2';
import { 
  Settings, 
  Mail, 
  Phone, 
  Globe, 
  Shield,
  Clock,
  Database,
  Zap
} from 'lucide-react';

interface SystemConfig {
  emailDelivery: {
    enabled: boolean;
    provider: string;
    dailyLimit: number;
    sentToday: number;
  };
  integrations: {
    twilio: {
      enabled: boolean;
      accountSid: string;
      phoneNumber: string;
    };
    apis: {
      xApi: boolean;
      youtubeApi: boolean;
      redditApi: boolean;
      googleAlerts: boolean;
    };
  };
  quotas: {
    defaultUserQuota: number;
    moderatorQuota: number;
    adminQuota: number;
  };
  cronJobs: {
    sentimentProcessing: boolean;
    dataArchiving: boolean;
    healthChecks: boolean;
  };
}

const ConfigurationOverview: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({
    emailDelivery: {
      enabled: true,
      provider: 'SendGrid',
      dailyLimit: 1000,
      sentToday: 0
    },
    integrations: {
      twilio: {
        enabled: false,
        accountSid: '',
        phoneNumber: ''
      },
      apis: {
        xApi: true,
        youtubeApi: true,
        redditApi: true,
        googleAlerts: true
      }
    },
    quotas: {
      defaultUserQuota: 100,
      moderatorQuota: 500,
      adminQuota: 1000
    },
    cronJobs: {
      sentimentProcessing: true,
      dataArchiving: true,
      healthChecks: true
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchConfigurationData();
  }, []);

  const fetchConfigurationData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch email delivery stats
      const emailResponse = await fetch('/api/admin/email-delivery');
      const emailData = await emailResponse.json();
      
      // Fetch quota configuration
      const quotaResponse = await fetch('/api/admin/quota-config');
      const quotaData = await quotaResponse.json();
      
      // Update config with fetched data
      setConfig(prev => ({
        ...prev,
        emailDelivery: {
          ...prev.emailDelivery,
          sentToday: emailData.sentToday || 0
        },
        quotas: {
          ...prev.quotas,
          ...quotaData
        }
      }));
      
    } catch (error) {
      console.error('Error fetching configuration data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigUpdate = async (section: string, updates: any) => {
    try {
      await fetch(`/api/admin/config/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      setConfig(prev => ({
        ...prev,
        [section]: { ...prev[section as keyof SystemConfig], ...updates }
      }));
    } catch (error) {
      console.error('Error updating configuration:', error);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System Configuration"
        subtitle="Manage system settings, integrations, and quotas"
        onRefresh={fetchConfigurationData}
        isLoading={isLoading}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Configuration' }
        ]}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Email Delivery"
          value={config.emailDelivery.sentToday}
          subtitle={`${config.emailDelivery.dailyLimit} daily limit`}
          status={config.emailDelivery.enabled ? 'healthy' : 'warning'}
          icon={<Mail className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="API Integrations"
          value={Object.values(config.integrations.apis).filter(Boolean).length}
          subtitle={`${Object.keys(config.integrations.apis).length} total APIs`}
          status="info"
          icon={<Globe className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Active Cron Jobs"
          value={Object.values(config.cronJobs).filter(Boolean).length}
          subtitle={`${Object.keys(config.cronJobs).length} total jobs`}
          status="info"
          icon={<Clock className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Default User Quota"
          value={config.quotas.defaultUserQuota}
          subtitle="API calls per day"
          status="info"
          icon={<Shield className="w-5 h-5" />}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Delivery</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-enabled">Email Delivery Enabled</Label>
                  <Switch
                    id="email-enabled"
                    checked={config.emailDelivery.enabled}
                    onCheckedChange={(checked) => 
                      handleConfigUpdate('emailDelivery', { enabled: checked })
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="email-provider">Provider</Label>
                  <Input
                    id="email-provider"
                    value={config.emailDelivery.provider}
                    onChange={(e) => 
                      handleConfigUpdate('emailDelivery', { provider: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="daily-limit">Daily Limit</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={config.emailDelivery.dailyLimit}
                    onChange={(e) => 
                      handleConfigUpdate('emailDelivery', { dailyLimit: parseInt(e.target.value) })
                    }
                    className="mt-1"
                  />
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Sent Today</span>
                    <span className="font-medium">{config.emailDelivery.sentToday}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min((config.emailDelivery.sentToday / config.emailDelivery.dailyLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Integrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>API Integrations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.integrations.apis).map(([api, enabled]) => (
                  <div key={api} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium capitalize">
                      {api.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <AdminStatusBadge 
                      status={enabled ? 'healthy' : 'error'} 
                      text={enabled ? 'Active' : 'Inactive'} 
                    />
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('integrations')}
                >
                  Manage Integrations
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Twilio Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="w-5 h-5" />
                  <span>Twilio SMS</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="twilio-enabled">SMS Enabled</Label>
                  <Switch
                    id="twilio-enabled"
                    checked={config.integrations.twilio.enabled}
                    onCheckedChange={(checked) => 
                      handleConfigUpdate('integrations', { 
                        twilio: { ...config.integrations.twilio, enabled: checked }
                      })
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="account-sid">Account SID</Label>
                  <Input
                    id="account-sid"
                    value={config.integrations.twilio.accountSid}
                    onChange={(e) => 
                      handleConfigUpdate('integrations', { 
                        twilio: { ...config.integrations.twilio, accountSid: e.target.value }
                      })
                    }
                    className="mt-1"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    value={config.integrations.twilio.phoneNumber}
                    onChange={(e) => 
                      handleConfigUpdate('integrations', { 
                        twilio: { ...config.integrations.twilio, phoneNumber: e.target.value }
                      })
                    }
                    className="mt-1"
                    placeholder="+1234567890"
                  />
                </div>
              </CardContent>
            </Card>

            {/* API Status */}
            <Card>
              <CardHeader>
                <CardTitle>API Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.integrations.apis).map(([api, enabled]) => (
                  <div key={api} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium capitalize">
                        {api.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => 
                        handleConfigUpdate('integrations', { 
                          apis: { ...config.integrations.apis, [api]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-6">
          <AdminQuotaManagerV2 />
        </TabsContent>

        <TabsContent value="cron" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Cron Job Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(config.cronJobs).map(([job, enabled]) => (
                <div key={job} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium capitalize">
                        {job.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <p className="text-xs text-gray-500">
                        {job === 'sentimentProcessing' && 'Process sentiment analysis every hour'}
                        {job === 'dataArchiving' && 'Archive old data daily'}
                        {job === 'healthChecks' && 'Run system health checks every 5 minutes'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => 
                      handleConfigUpdate('cronJobs', { [job]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfigurationOverview;