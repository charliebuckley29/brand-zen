import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Flag, Clock, MessageCircle } from "lucide-react";

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

interface MentionsTableProps {
  mentions: Mention[];
  onMentionClick: (mention: Mention) => void;
  getSentimentEmoji: (sentiment: string | null) => string;
}

export function MentionsTable({ mentions, onMentionClick, getSentimentEmoji }: MentionsTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-success/10 text-success border-success/20';
      case 'negative': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'neutral': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (mentions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No mentions found</h3>
        <p className="text-muted-foreground text-sm">Set up your brand monitoring to start tracking mentions.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3 p-3">
        {mentions.map((mention) => (
          <Card 
            key={mention.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onMentionClick(mention)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{mention.source_name}</span>
                  {mention.flagged && <Flag className="h-3 w-3 text-warning" />}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(mention.source_url, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              
              <p className="text-sm text-foreground mb-3 line-clamp-2">
                {mention.content_snippet}
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
                  {getSentimentEmoji(mention.sentiment)} {mention.sentiment || 'Unknown'}
                </Badge>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(mention.published_at)}
                </div>
              </div>
              
              {(mention.topics.length > 0 || mention.escalation_type !== 'none') && (
                <div className="flex flex-wrap gap-1">
                  {mention.topics.slice(0, 3).map((topic, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {mention.topics.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{mention.topics.length - 3}
                    </Badge>
                  )}
                  {mention.escalation_type !== 'none' && (
                    <Badge variant="destructive" className="text-xs">
                      {mention.escalation_type.toUpperCase()}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Source</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-[120px]">Sentiment</TableHead>
                <TableHead className="w-[150px]">Topics</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Published</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentions.map((mention) => (
                <TableRow 
                  key={mention.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onMentionClick(mention)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{mention.source_name}</span>
                      {mention.flagged && <Flag className="h-4 w-4 text-warning" />}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate">{mention.content_snippet}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
                      {getSentimentEmoji(mention.sentiment)} {mention.sentiment || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mention.topics.slice(0, 2).map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {mention.topics.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{mention.topics.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {mention.escalation_type !== 'none' && (
                      <Badge variant="destructive" className="text-xs">
                        {mention.escalation_type.toUpperCase()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(mention.published_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(mention.source_url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}