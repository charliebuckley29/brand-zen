import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Scale, Users, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  published_at: string;
  content_snippet: string;
  full_text: string | null;
  sentiment: string | null;
  topics: string[];
  flagged: boolean;
  escalation_type: string;
  internal_notes: string | null;
}

interface MentionModalProps {
  mention: Mention;
  onClose: () => void;
  onUpdate: () => void;
  getSentimentEmoji: (sentiment: string | null) => string;
}

export function MentionModal({ mention, onClose, onUpdate, getSentimentEmoji }: MentionModalProps) {
  const [flagged, setFlagged] = useState(mention.flagged);
  const [escalationType, setEscalationType] = useState(mention.escalation_type);
  const [internalNotes, setInternalNotes] = useState(mention.internal_notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedText, setResolvedText] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
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

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'neutral': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleEscalate = async (type: 'legal' | 'pr') => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("mentions")
        .update({ 
          escalation_type: type,
          flagged: true,
          internal_notes: internalNotes 
        })
        .eq("id", mention.id);

      if (error) throw error;

      setEscalationType(type);
      setFlagged(true);
      
      toast({
        title: "Mention escalated",
        description: `This mention has been escalated to ${type.toUpperCase()} team.`,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mention.content_snippet}
            {flagged && <Flag className="h-4 w-4 text-orange-500" />}
          </DialogTitle>
          <DialogDescription>
            Published on {formatDate(mention.published_at)} by {mention.source_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source and Link */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{mention.source_name}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(mention.published_at)}</p>
            </div>
            <Button variant="outline" onClick={() => window.open(mention.source_url, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Source
            </Button>
          </div>

          {/* Sentiment and Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Sentiment</Label>
              <Badge variant="secondary" className={getSentimentColor(mention.sentiment)}>
                {getSentimentEmoji(mention.sentiment)} {mention.sentiment || 'Unknown'}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Topics</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {mention.topics.map((topic, index) => (
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
              {isResolving && !(resolvedText || mention.full_text) && (
                <p className="text-sm text-muted-foreground">Fetching article body…</p>
              )}
              {(resolvedText || mention.full_text) ? (
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {resolvedText || mention.full_text}
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
            <div className="flex gap-2">
              <Button
                variant={escalationType === 'legal' ? 'default' : 'outline'}
                onClick={() => handleEscalate('legal')}
                disabled={isLoading}
                className="flex-1"
              >
                <Scale className="w-4 h-4 mr-2" />
                Escalate to Legal
              </Button>
              <Button
                variant={escalationType === 'pr' ? 'default' : 'outline'}
                onClick={() => handleEscalate('pr')}
                disabled={isLoading}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Escalate to PR
              </Button>
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