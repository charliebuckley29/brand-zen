import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  ExternalLink,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PendingUser {
  user_id: string;
  full_name: string;
  created_at: string;
  user_status: string;
  created_by_staff: boolean;
  rejection_reason?: string;
  keywords: any[];
  hasRssUrl: boolean;
}

export function UserApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/admin/user-approvals');
      if (response.ok) {
        const result = await response.json();
        setPendingUsers(result.data || []);
      } else {
        toast.error('Failed to fetch pending users');
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Failed to fetch pending users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(userId);
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/admin/user-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
          moderatorId: 'current-moderator-id' // TODO: Get from auth context
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        await fetchPendingUsers();
        setSelectedUser(null);
        setRejectionReason('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (user: PendingUser) => {
    if (user.user_status === 'pending_approval') {
      if (user.hasRssUrl) {
        return <Badge variant="default" className="bg-green-500">Ready</Badge>;
      } else {
        return <Badge variant="default" className="bg-yellow-500">Needs RSS URL</Badge>;
      }
    }
    return <Badge variant="default" className="bg-gray-500">{user.user_status}</Badge>;
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Approval Management
        </CardTitle>
        <CardDescription>
          Review and approve new user accounts. Users need both approval and Google RSS URL setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            onClick={fetchPendingUsers} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <div className="text-sm text-muted-foreground">
            {pendingUsers.length} pending approval
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No users pending approval. All caught up!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <Card key={user.user_id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Signed up {format(new Date(user.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    {getStatusBadge(user)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Keywords ({user.keywords.length})</h4>
                      {user.keywords.length > 0 ? (
                        <div className="space-y-1">
                          {user.keywords.map((keyword) => (
                            <div key={keyword.id} className="flex items-center justify-between text-sm">
                              <span>{keyword.brand_name}</span>
                              <div className="flex items-center gap-1">
                                {keyword.google_alert_rss_url ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span className="text-xs">
                                  {keyword.google_alert_rss_url ? 'RSS Set' : 'No RSS'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No keywords configured</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Account Status</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Staff Signup:</span>
                          <span>{user.created_by_staff ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>RSS URL:</span>
                          <span>{user.hasRssUrl ? 'Configured' : 'Not Set'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleUserAction(user.user_id, 'approve')}
                      disabled={actionLoading === user.user_id || !user.hasRssUrl}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => setSelectedUser(selectedUser === user.user_id ? null : user.user_id)}
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>

                    {!user.hasRssUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Open RSS URL setup modal
                          toast.info('RSS URL setup feature coming soon');
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Setup RSS
                      </Button>
                    )}
                  </div>

                  {selectedUser === user.user_id && (
                    <div className="mt-4 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20">
                      <Label htmlFor="rejection-reason" className="text-sm font-medium">
                        Rejection Reason (Optional)
                      </Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Enter reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() => handleUserAction(user.user_id, 'reject')}
                          disabled={actionLoading === user.user_id}
                          size="sm"
                          variant="destructive"
                        >
                          {actionLoading === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Confirm Rejection
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedUser(null);
                            setRejectionReason('');
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
