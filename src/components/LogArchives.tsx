import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Download, Archive, Trash2, RefreshCw, Database, HardDrive } from 'lucide-react';
import { createApiUrl } from '../lib/api';

interface ArchiveFile {
  file_path: string;
  file_size: number;
  log_count: number;
  archive_date: string;
  created_at: string;
  batch_number: number;
}

interface ArchiveStats {
  totalFiles: number;
  totalSize: number;
  totalSizeMB: number;
  oldestFile: string | null;
  newestFile: string | null;
  databaseLogCount: number;
  bucketName: string;
}

export default function LogArchives() {
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchArchiveData = async () => {
    try {
      setLoading(true);
      const response = await fetch(createApiUrl('/api/cron/archive-logs'));
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        // Get list of archive files from metadata
        const filesResponse = await fetch(createApiUrl('/api/admin/log-archives'));
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          if (filesData.success) {
            setFiles(filesData.files || []);
          }
        }
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch archive data' });
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, filePath?: string) => {
    try {
      setActionLoading(action);
      setMessage(null);

      if (action === 'download' && filePath) {
        // Download file from Supabase Storage
        const response = await fetch(createApiUrl(`/api/admin/download-archive?path=${encodeURIComponent(filePath)}`));
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filePath.split('/').pop() || 'archive.txt';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setMessage({ type: 'success', text: 'File downloaded successfully' });
        } else {
          setMessage({ type: 'error', text: 'Failed to download file' });
        }
      } else if (action === 'archive_now') {
        // Trigger archive process
        const response = await fetch(createApiUrl('/api/cron/archive-logs'), {
          method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
          setMessage({ type: 'success', text: `Archived ${data.results?.archived?.count || 0} logs successfully` });
          await fetchArchiveData();
        } else {
          setMessage({ type: 'error', text: data.error });
        }
      } else if (action === 'archive_all') {
        // Trigger full archive (for initial cleanup)
        const response = await fetch(createApiUrl('/api/admin/archive-all-logs'), {
          method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
          setMessage({ type: 'success', text: `Archived ${data.results?.archived?.count || 0} logs successfully` });
          await fetchArchiveData();
        } else {
          setMessage({ type: 'error', text: data.error });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchArchiveData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading archive data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Log Archives</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => performAction('archive_all')}
            disabled={actionLoading === 'archive_all'}
            variant="default"
          >
            <Archive className="h-4 w-4 mr-2" />
            {actionLoading === 'archive_all' ? 'Archiving All...' : 'Archive All Logs'}
          </Button>
          <Button
            onClick={() => performAction('archive_now')}
            disabled={actionLoading === 'archive_now'}
            variant="outline"
          >
            <Archive className="h-4 w-4 mr-2" />
            {actionLoading === 'archive_now' ? 'Archiving...' : 'Archive Old Logs'}
          </Button>
          <Button onClick={fetchArchiveData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Archive Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Archive Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSizeMB} MB</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                DB Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.databaseLogCount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Oldest Archive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                {stats.oldestFile ? new Date(stats.oldestFile).toLocaleDateString() : 'None'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Newest Archive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                {stats.newestFile ? new Date(stats.newestFile).toLocaleDateString() : 'None'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Archive Files</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No archive files found
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.file_path} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{file.file_path.split('/').pop()}</div>
                    <div className="text-sm text-gray-500">
                      {Math.round(file.file_size / (1024 * 1024) * 100) / 100} MB • 
                      {file.log_count.toLocaleString()} logs • 
                      Batch {file.batch_number} • 
                      Created: {new Date(file.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Path: {file.file_path}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{Math.round(file.file_size / (1024 * 1024) * 100) / 100} MB</Badge>
                    <Badge variant="secondary">{file.log_count.toLocaleString()} logs</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performAction('download', file.file_path)}
                      disabled={actionLoading === 'download'}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
