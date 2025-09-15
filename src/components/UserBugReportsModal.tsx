import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bug, Calendar, MessageSquare, User, ExternalLink, Loader2, AlertCircle } from "lucide-react";

interface UserBugReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BugReport {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  screenshots?: string[];
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  is_internal: boolean;
  commenter_name?: string;
}

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

export function UserBugReportsModal({ open, onOpenChange }: UserBugReportsModalProps) {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const { toast } = useToast();

  const fetchBugReports = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: reports, error } = await (supabase as any)
        .from('bug_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBugReports(reports || []);

      // Fetch non-internal comments for all reports
      if (reports && reports.length > 0) {
        const reportIds = reports.map((r: any) => r.id);
        
        const { data: commentsData, error: commentsError } = await (supabase as any)
          .from('bug_report_comments')
          .select(`
            id,
            comment,
            created_at,
            is_internal,
            bug_report_id,
            user_id
          `)
          .in('bug_report_id', reportIds)
          .eq('is_internal', false)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        // Group comments by bug report ID
        const groupedComments: Record<string, Comment[]> = {};
        commentsData?.forEach((comment: any) => {
          if (!groupedComments[comment.bug_report_id]) {
            groupedComments[comment.bug_report_id] = [];
          }
          groupedComments[comment.bug_report_id].push({
            id: comment.id,
            content: comment.comment,
            created_at: comment.created_at,
            is_internal: comment.is_internal,
            commenter_name: 'Team Member'
          });
        });

        setComments(groupedComments);
      }
    } catch (error: any) {
      console.error('Error fetching bug reports:', error);
      toast({
        title: "Failed to load bug reports",
        description: error.message || "An error occurred while loading your bug reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchBugReports();
    }
  }, [open]);

  const handleReportClick = (report: BugReport) => {
    setSelectedReport(selectedReport?.id === report.id ? null : report);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading your bug reports...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            My Bug Reports
          </DialogTitle>
          <DialogDescription>
            View all your submitted bug reports and team responses
          </DialogDescription>
        </DialogHeader>
        
        {bugReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No bug reports found</h3>
            <p className="text-muted-foreground mb-4">
              You haven't submitted any bug reports yet.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {bugReports.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader onClick={() => handleReportClick(report)} className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {report.description}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Badge className={statusColors[report.status]}>
                          {formatStatus(report.status)}
                        </Badge>
                        <Badge variant="outline" className={priorityColors[report.priority]}>
                          {formatPriority(report.priority)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatTimeAgo(report.created_at)}
                      </div>
                      {comments[report.id] && comments[report.id].length > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {comments[report.id].length} team response{comments[report.id].length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  {selectedReport?.id === report.id && (
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />
                      
                      {/* Report Details */}
                      <div className="space-y-4">
                        {report.steps_to_reproduce && (
                          <div>
                            <h4 className="font-medium mb-2">Steps to Reproduce:</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {report.steps_to_reproduce}
                            </p>
                          </div>
                        )}
                        
                        {(report.expected_behavior || report.actual_behavior) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.expected_behavior && (
                              <div>
                                <h4 className="font-medium mb-2">Expected Behavior:</h4>
                                <p className="text-sm text-muted-foreground">
                                  {report.expected_behavior}
                                </p>
                              </div>
                            )}
                            {report.actual_behavior && (
                              <div>
                                <h4 className="font-medium mb-2">Actual Behavior:</h4>
                                <p className="text-sm text-muted-foreground">
                                  {report.actual_behavior}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Screenshots */}
                        {report.screenshots && report.screenshots.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Screenshots:</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {report.screenshots.map((url, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={url}
                                    alt={`Screenshot ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                  <ExternalLink className="absolute top-1 right-1 h-3 w-3 text-white bg-black/50 rounded p-0.5" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Team Comments */}
                        {comments[report.id] && comments[report.id].length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Team Responses:</h4>
                            <div className="space-y-3">
                              {comments[report.id].map((comment) => (
                                <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium text-sm">{comment.commenter_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
