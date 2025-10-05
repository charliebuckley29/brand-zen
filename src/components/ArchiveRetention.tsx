import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Trash2, Settings, Save, AlertTriangle } from 'lucide-react';
import { createApiUrl } from '../lib/api';
import { useGlobalSettings } from '../hooks/useGlobalSettings';


export default function ArchiveRetention() {
  const { settings: globalSettings, loading: settingsLoading, refreshSettings } = useGlobalSettings();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newRetentionDays, setNewRetentionDays] = useState<number>(90);

  // Get retention days from global settings
  const retentionDays = globalSettings.archive_retention_days || 90;

  useEffect(() => {
    setNewRetentionDays(retentionDays);
  }, [retentionDays]);

  const updateRetention = async () => {
    try {
      setActionLoading('update');
      setMessage(null);

      const response = await fetch(createApiUrl('/api/admin/archive-retention'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_retention',
          retentionDays: newRetentionDays
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await refreshSettings(); // Refresh global settings
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update retention settings' });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteOldArchives = async () => {
    try {
      setActionLoading('delete');
      setMessage(null);

      const response = await fetch(createApiUrl('/api/admin/archive-retention'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_old_archives',
          retentionDays: retentionDays
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete old archives' });
    } finally {
      setActionLoading(null);
    }
  };

  // No need for useEffect since useGlobalSettings handles loading

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading retention settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Archive Retention Settings</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          <Settings className="h-3 w-3" />
          Configurable
        </Badge>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Retention Period</Label>
              <div className="text-2xl font-bold text-blue-600">
                {retentionDays} days
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Archived logs are automatically deleted after this period
              </p>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Archives older than {retentionDays} days are automatically deleted</li>
                <li>• Cleanup runs after each archiving session</li>
                <li>• Files are removed from Supabase Storage and metadata</li>
                <li>• You can manually trigger cleanup anytime</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Update Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Update Retention Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="retention-days">Retention Days</Label>
              <Input
                id="retention-days"
                type="number"
                min="1"
                max="3650"
                value={newRetentionDays}
                onChange={(e) => setNewRetentionDays(parseInt(e.target.value) || 90)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Range: 1-3650 days (1 day to 10 years)
              </p>
            </div>

            <Button
              onClick={updateRetention}
              disabled={actionLoading === 'update' || newRetentionDays === retentionDays}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {actionLoading === 'update' ? 'Updating...' : 'Update Retention'}
            </Button>

            {newRetentionDays !== retentionDays && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  This will change the retention period from {retentionDays} to {newRetentionDays} days.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Manual Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Manually delete archive files older than the current retention period ({retentionDays} days).
              This action cannot be undone.
            </p>
            
            <Button
              onClick={deleteOldArchives}
              disabled={actionLoading === 'delete'}
              variant="destructive"
              className="w-full md:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {actionLoading === 'delete' ? 'Deleting...' : 'Delete Old Archives'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
