import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Flag } from "lucide-react";

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
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'neutral': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (mentions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No mentions found. Set up your brand monitoring to start tracking mentions.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Source</TableHead>
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
                  {mention.source_name}
                  {mention.flagged && <Flag className="h-4 w-4 text-orange-500" />}
                </div>
              </TableCell>
              <TableCell className="max-w-md">
                <p className="truncate">{mention.content_snippet}</p>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={getSentimentColor(mention.sentiment)}>
                  {getSentimentEmoji(mention.sentiment)} {mention.sentiment || 'Unknown'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {mention.topics.slice(0, 2).map((topic, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {mention.topics.length > 2 && (
                    <Badge variant="outline" className="text-xs">
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
  );
}