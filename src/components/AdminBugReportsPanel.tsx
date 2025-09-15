import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bug, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  ExternalLink,
  Eye,
  Edit3,
  Save,
  X
} from "lucide-react";

interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  browser_info: any;
  console_logs: string | null;
  screenshots: string[] | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  internal_notes: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  user_profile?: {
    full_name: string;
    email: string;
  };
  assigned_profile?: {
    full_name: string;
  };
}

interface BugComment {
  id: string;
  bug_report_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  user_profile?: {
    full_name: string;
  };
}

export function AdminBugReportsPanel() {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [comments, setComments] = useState<Record<string, BugComment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [editMode, setEditMode] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({
    status: 'open',
    priority: 'medium',
    assigned_to: '',
    tags: '',
    internal_notes: ''
  });
  const { toast } = useToast();

  const statusIcons = {
    open: <Clock className="h-4 w-4" />,
    in_progress: <AlertTriangle className="h-4 w-4" />,
    resolved: <CheckCircle className="h-4 w-4" />,
    closed: <XCircle className="h-4 w-4" />,
    wont_fix: <X className="h-4 w-4" />
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    wont_fix: 'bg-red-100 text-red-800'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    fetchBugReports();
  }, []);

  const fetchBugReports = async () => {
    try {
      setLoading(true);
      
      // Fetch bug reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('bug_reports' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Get user profiles for each report
      const userIds = [...new Set((reportsData || []).map((report: any) => report.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Get user emails
      const { data: emailsData } = await supabase
        .rpc('get_user_emails_for_moderator');

      const profilesMap: Record<string, string> = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.user_id] = profile.full_name;
      });

      const emailsMap: Record<string, string> = {};
      emailsData?.forEach(emailData => {
        emailsMap[emailData.user_id] = emailData.email;
      });

      const formattedReports: BugReport[] = (reportsData || []).map((report: any) => ({
        ...report,
        user_profile: {
          full_name: profilesMap[report.user_id] || 'Unknown User',
          email: emailsMap[report.user_id] || 'Email not available'
        },
        assigned_profile: report.assigned_to ? { full_name: profilesMap[report.assigned_to] || 'Unknown' } : null
      }));

      setBugReports(formattedReports);
    } catch (error) {
      console.error("Error fetching bug reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch bug reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (bugReportId: string) => {
    try {
      const { data, error } = await supabase
        .from('bug_report_comments' as any)
        .select('*')
        .eq('bug_report_id', bugReportId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles for comments
      const userIds = [...new Set((data || []).map((comment: any) => comment.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profilesMap: Record<string, string> = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.user_id] = profile.full_name;
      });

      const formattedComments: BugComment[] = (data || []).map((comment: any) => ({
        ...comment,
        user_profile: { full_name: profilesMap[comment.user_id] || 'Unknown User' }
      }));

      setComments(prev => ({
        ...prev,
        [bugReportId]: formattedComments
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const updateBugReport = async () => {
    if (!selectedBug) return;

    setIsUpdating(true);
    try {
      const updateData: any = {
        status: editData.status,
        priority: editData.priority,
        assigned_to: editData.assigned_to || null,
        tags: editData.tags ? editData.tags.split(',').map(t => t.trim()) : [],
        internal_notes: editData.internal_notes ? [editData.internal_notes] : []
      };

      if (editData.status === 'resolved' && selectedBug.status !== 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bug_reports' as any)
        .update(updateData)
        .eq('id', selectedBug.id);

      if (error) throw error;

      toast({
        title: "Bug report updated",
        description: "Changes saved successfully"
      });

      setEditMode(false);
      fetchBugReports();
      
      // Update selected bug
      setSelectedBug(prev => prev ? { ...prev, ...updateData } : null);
    } catch (error: any) {
      console.error("Error updating bug report:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const addComment = async () => {
    if (!selectedBug || !newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('bug_report_comments' as any)
        .insert({
          bug_report_id: selectedBug.id,
          user_id: user.id,
          comment: newComment.trim(),
          is_internal: isInternalComment
        });

      if (error) throw error;

      toast({
        title: "Comment added",
        description: "Your comment has been added to the bug report"
      });

      setNewComment('');
      setIsInternalComment(false);
      fetchComments(selectedBug.id);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Comment failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openBugDetail = (bug: BugReport) => {
    setSelectedBug(bug);
    setEditData({
      status: bug.status,
      priority: bug.priority,
      assigned_to: bug.assigned_to || '',
      tags: bug.tags?.join(', ') || '',
      internal_notes: bug.internal_notes?.join('\n') || ''
    });
    setEditMode(false);
    setDetailOpen(true);
    fetchComments(bug.id);
  };

  const filteredReports = bugReports.filter(report => {
    const statusMatch = filterStatus === 'all' || report.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || report.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading bug reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bug Reports</h1>
          <p className="text-muted-foreground">
            Manage and track bug reports from users
          </p>
        </div>
        <Button onClick={fetchBugReports} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2">
          <Label>Status Filter</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="wont_fix">Won't Fix</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Priority Filter</Label>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bug Reports Grid */}
      <div className="grid gap-4">
        {filteredReports.map((bug) => (
          <Card key={bug.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openBugDetail(bug)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{bug.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    {bug.user_profile?.full_name}
                    <Calendar className="h-3 w-3 ml-2" />
                    {new Date(bug.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColors[bug.priority]}>
                    {bug.priority}
                  </Badge>
                  <Badge className={statusColors[bug.status]}>
                    {statusIcons[bug.status]}
                    <span className="ml-1">{bug.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bug.description}
              </p>
              {bug.tags && bug.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {bug.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No bug reports found</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bug Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedBug && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  {selectedBug.title}
                </DialogTitle>
                <DialogDescription>
                  Reported by {selectedBug.user_profile?.full_name} on {new Date(selectedBug.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                  <TabsTrigger value="management">Management</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm mt-1">{selectedBug.description}</p>
                    </div>

                    {selectedBug.steps_to_reproduce && (
                      <div>
                        <Label className="text-sm font-medium">Steps to Reproduce</Label>
                        <pre className="text-sm mt-1 whitespace-pre-wrap">{selectedBug.steps_to_reproduce}</pre>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBug.expected_behavior && (
                        <div>
                          <Label className="text-sm font-medium">Expected Behavior</Label>
                          <p className="text-sm mt-1">{selectedBug.expected_behavior}</p>
                        </div>
                      )}

                      {selectedBug.actual_behavior && (
                        <div>
                          <Label className="text-sm font-medium">Actual Behavior</Label>
                          <p className="text-sm mt-1">{selectedBug.actual_behavior}</p>
                        </div>
                      )}
                    </div>

                    {selectedBug.screenshots && selectedBug.screenshots.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Screenshots</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {selectedBug.screenshots.map((url, index) => (
                            <a 
                              key={index} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={url}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-24 object-cover rounded border hover:opacity-80"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="technical" className="space-y-4">
                  {selectedBug.browser_info && (
                    <div>
                      <Label className="text-sm font-medium">Browser Information</Label>
                      <pre className="text-xs mt-1 bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedBug.browser_info, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedBug.console_logs && (
                    <div>
                      <Label className="text-sm font-medium">Console Logs</Label>
                      <pre className="text-xs mt-1 bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                        {selectedBug.console_logs}
                      </pre>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  <div className="space-y-4">
                    {comments[selectedBug.id]?.map((comment) => (
                      <div key={comment.id} className={`p-3 rounded border ${comment.is_internal ? 'bg-yellow-50 border-yellow-200' : 'bg-background'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{comment.user_profile?.full_name}</span>
                          {comment.is_internal && (
                            <Badge variant="outline" className="text-xs">Internal</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))}

                    <div className="space-y-3 border-t pt-4">
                      <Label>Add Comment</Label>
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isInternalComment}
                            onChange={(e) => setIsInternalComment(e.target.checked)}
                          />
                          Internal comment (not visible to user)
                        </label>
                        <Button onClick={addComment} disabled={!newComment.trim()}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="management" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Bug Management</h3>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(!editMode)}
                      disabled={isUpdating}
                    >
                      {editMode ? <X className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                      {editMode ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>

                  {editMode ? (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Status</Label>
                          <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="wont_fix">Won't Fix</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Priority</Label>
                          <Select value={editData.priority} onValueChange={(value) => setEditData(prev => ({ ...prev, priority: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          value={editData.tags}
                          onChange={(e) => setEditData(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="ui, login, performance"
                        />
                      </div>

                      <div>
                        <Label>Internal Notes</Label>
                        <Textarea
                          value={editData.internal_notes}
                          onChange={(e) => setEditData(prev => ({ ...prev, internal_notes: e.target.value }))}
                          placeholder="Internal notes for the development team..."
                          rows={3}
                        />
                      </div>

                      <Button onClick={updateBugReport} disabled={isUpdating}>
                        {isUpdating ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <div className="mt-1">
                            <Badge className={statusColors[selectedBug.status]}>
                              {statusIcons[selectedBug.status]}
                              <span className="ml-1">{selectedBug.status.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Priority</Label>
                          <div className="mt-1">
                            <Badge className={priorityColors[selectedBug.priority]}>
                              {selectedBug.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {selectedBug.tags && selectedBug.tags.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Tags</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedBug.tags.map((tag, index) => (
                              <Badge key={index} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedBug.internal_notes && selectedBug.internal_notes.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Internal Notes</Label>
                          <div className="mt-1 space-y-1">
                            {selectedBug.internal_notes.map((note, index) => (
                              <p key={index} className="text-sm bg-muted p-2 rounded">
                                {note}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedBug.resolved_at && (
                        <div>
                          <Label className="text-sm font-medium">Resolved At</Label>
                          <p className="text-sm mt-1">{new Date(selectedBug.resolved_at).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
