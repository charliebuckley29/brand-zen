import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Scale, Users, Flag, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cleanHtmlContent } from "@/lib/contentUtils";

interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  published_at: string;
  content_snippet: string;
  full_text: string | null;
  cleaned_text: string | null; // Clean, readable version of the content
  sentiment: number | null; // -1 = unknown, 0 = strongly negative, 100 = strongly positive
  topics: string[] | null;
  flagged: boolean;
  escalation_type: string;
  internal_notes: string | null;
  legal_escalated_at: string | null;
  pr_escalated_at: string | null;
}

interface MentionModalProps {
  mention: Mention;
  onClose: () => void;
  onUpdate: () => void;
  getSentimentEmoji: (sentiment: number | null) => string;
}

export function MentionModal({ mention, onClose, onUpdate, getSentimentEmoji }: MentionModalProps) {
  const [flagged, setFlagged] = useState(mention.flagged);
  const [escalationType, setEscalationType] = useState(mention.escalation_type);
  const [internalNotes, setInternalNotes] = useState(mention.internal_notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedText, setResolvedText] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [userProfile, setUserProfile] = useState<{ team_emails: string[] } | null>(null);
  const [isTeamEscalated, setIsTeamEscalated] = useState(!!mention.team_escalated_at);
  const [showTeamSpamWarning, setShowTeamSpamWarning] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment: number | null) => {
    if (sentiment === null) return 'bg-blue-100 text-blue-800 border-blue-200'; // Pending
    if (sentiment === -1) return 'bg-muted text-muted-foreground'; // Unknown
    if (sentiment === 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'; // Neutral
    if (sentiment <= 49) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'; // Negative
    if (sentiment >= 51) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; // Positive
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'; // Default to neutral
  };

  const getSentimentLabel = (sentiment: number | null) => {
    if (sentiment === null) return 'Pending';
    if (sentiment === -1) return 'Unknown';
    if (sentiment === 50) return 'Neutral';
    if (sentiment <= 49) return 'Negative';
    if (sentiment >= 51) return 'Positive';
    return 'Neutral';
  };

  const handleEscalateToTeam = async () => {
    if (!userProfile?.team_emails || userProfile.team_emails.length === 0) {
      toast({
        title: "No team emails configured",
        description: "Please configure team emails in your settings before escalating.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update the mention in database - try step by step to isolate the issue
      console.log('Team emails to escalate to:', userProfile.team_emails);
      
      // First, try just updating the escalation type
      const { error: basicError } = await supabase
        .from("mentions")
        .update({ 
          escalation_type: 'team',
          flagged: true,
          internal_notes: internalNotes 
        })
        .eq("id", mention.id);

      if (basicError) {
        console.error('Basic escalation update error:', basicError);
        throw basicError;
      }

      // Then try to update the new team escalation fields
      try {
        const { error: teamError } = await supabase
          .from("mentions")
          .update({
            team_escalated_at: new Date().toISOString(),
            escalated_team_emails: userProfile.team_emails
          })
          .eq("id", mention.id);

        if (teamError) {
          console.warn('Team escalation fields update failed:', teamError);
          // Don't throw here - the basic escalation worked
        }
      } catch (teamUpdateError) {
        console.warn('Team escalation fields update failed:', teamUpdateError);
        // Don't throw here - the basic escalation worked
      }

      // Get current user and profile for email context
      const { data: authUser } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", authUser.user?.id)
        .single();

      
      // Send escalation emails to all team members
      try {
        await supabase.functions.invoke('send-team-escalation-email', {
          body: {
            mentionId: mention.id,
            teamEmails: userProfile.team_emails,
            mentionData: {
              id: mention.id,
              source_url: mention.source_url,
              source_name: mention.source_name,
              content_snippet: mention.content_snippet,
              full_text: mention.full_text,
              sentiment: mention.sentiment,
              published_at: mention.published_at,
              topics: mention.topics || [],
              flagged: true,
              internal_notes: internalNotes
            },
            userEmail: authUser.user?.email || 'Unknown',
            userName: profile?.full_name || 'Unknown User'
          }
        });
      } catch (emailError) {
        console.error('Failed to send escalation emails:', emailError);
        // Don't fail the escalation if email fails
      }

      setEscalationType('team');
      setFlagged(true);
      setIsTeamEscalated(true);
      
      toast({
        title: "Mention escalated",
        description: `This mention has been escalated to your team (${userProfile.team_emails.length} member${userProfile.team_emails.length === 1 ? '' : 's'}) and notification emails sent.`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to escalate mention.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlagToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("mentions")
        .update({ 
          flagged: checked,
          escalation_type: checked ? escalationType : 'none',
          internal_notes: internalNotes
        })
        .eq("id", mention.id);

      if (error) throw error;

      setFlagged(checked);
      if (!checked) {
        setEscalationType('none');
      }

      toast({
        title: checked ? "Mention flagged" : "Mention unflagged",
        description: checked ? "This mention has been flagged for attention." : "Flag removed from mention.",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update mention flag.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("mentions")
        .update({ internal_notes: internalNotes })
        .eq("id", mention.id);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Internal notes have been updated.",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const genericTagline = 'Comprehensive, up-to-date news coverage, aggregated from sources all over the world by Google News.';

  useEffect(() => {
    // Fetch user profile for escalation email settings
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("team_emails")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user profile:", error);
          return;
        }

        setUserProfile(profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();

    const needsResolve = !mention.full_text || !mention.full_text.trim() || mention.full_text.trim() === genericTagline;
    if (!needsResolve) return;

    let cancelled = false;
    const resolve = async () => {
      try {
        setIsResolving(true);
        const { data, error } = await supabase.functions.invoke('resolve-article', {
          body: { url: mention.source_url },
        });
        if (error) throw error;

        const resolved: string | null = data?.full_text || data?.content || data?.text || null;
        if (!cancelled && resolved && resolved.trim() && resolved.trim() !== genericTagline) {
          setResolvedText(resolved);
          // Persist improved body
          await supabase
            .from('mentions')
            .update({ full_text: resolved })
            .eq('id', mention.id);
          onUpdate();
        }
      } catch (err) {
        console.error('Failed to resolve article body', err);
        toast({ title: 'Could not fetch article body', variant: 'destructive' });
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [mention.id, mention.source_url]);
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cleanHtmlContent(mention.content_snippet)}
            {flagged && <Flag className="h-4 w-4 text-orange-500" />}
          </DialogTitle>
          <DialogDescription>
            Published on {formatDate(mention.published_at)} by {cleanHtmlContent(mention.source_name)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source and Link */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{cleanHtmlContent(mention.source_name)}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(mention.published_at)}</p>
            </div>
            <Button variant="outline" onClick={() => window.open(mention.source_url, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Source
            </Button>
          </div>

          {/* Sentiment and Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Sentiment</Label>
              <Badge variant="secondary" className={getSentimentColor(mention.sentiment)}>
                {mention.sentiment === null ? (
                  <span className="inline-flex items-center gap-1">
                    ⏳ <span className="text-blue-800">Pending</span>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}><Info className="h-3 w-3 text-blue-800 cursor-pointer" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Our AI agent is currently analyzing this mention to determine its sentiment. This usually takes a few seconds after the mention is first detected.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                ) : mention.sentiment === -1 ? (
                  <span className="inline-flex items-center gap-1">
                    ❓ <span className="text-muted-foreground">Unknown</span>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}><Info className="h-3 w-3 text-muted-foreground cursor-pointer" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Sentiment is unknown because there wasn't enough context to analyze this mention.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                ) : (
                  <>
                    {getSentimentEmoji(mention.sentiment)} {getSentimentLabel(mention.sentiment)} {(mention.sentiment !== 50) ? `(${mention.sentiment}%)` : ''}
                  </>
                )}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Topics</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {mention.topics && mention.topics.map((topic, index) => (
                  <Badge key={index} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Content</Label>
            <div className="mt-2 p-4 bg-muted rounded-lg">
              {isResolving && !(resolvedText || mention.cleaned_text || mention.full_text) && (
                <p className="text-sm text-muted-foreground">Fetching article body…</p>
              )}
              {(resolvedText || mention.cleaned_text || mention.full_text) ? (
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {cleanHtmlContent(resolvedText || mention.cleaned_text || mention.full_text || '')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No article body available for this mention.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold">Actions</h4>
            
            {/* Flag Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="flagged">Flag this mention</Label>
                <p className="text-sm text-muted-foreground">Mark this mention for special attention</p>
              </div>
              <Switch
                id="flagged"
                checked={flagged}
                onCheckedChange={handleFlagToggle}
                disabled={isLoading}
              />
            </div>

            {/* Escalation Buttons */}
            <div className="space-y-3">

              {/* Spam warning for team escalation */}
              {showTeamSpamWarning && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Already escalated today</p>
                    <p>This mention was already escalated to your team today. Only one email per day is sent to prevent spam.</p>
                  </div>
                </div>
              )}

              {/* Info card if no team emails configured */}
              {(!userProfile?.team_emails || userProfile.team_emails.length === 0) && (
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">No team emails configured</p>
                    <p>Configure team emails in your settings to enable escalation notifications.</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant={isTeamEscalated ? 'default' : 'outline'}
                  onClick={handleEscalateToTeam}
                  disabled={isLoading || !userProfile?.team_emails || userProfile.team_emails.length === 0}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {isTeamEscalated ? 'Escalated to Team' : 'Escalate to Team'}
                </Button>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add internal notes about this mention..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSaveNotes} disabled={isLoading} size="sm">
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}