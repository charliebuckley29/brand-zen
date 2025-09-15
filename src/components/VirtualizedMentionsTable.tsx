import React, { useMemo, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Mention } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  Flag, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MessageSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VirtualizedMentionsTableProps {
  mentions: Mention[];
  onMentionClick: (mention: Mention) => void;
  onFlagMention: (mention: Mention) => void;
  height?: number;
  itemHeight?: number;
  className?: string;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    mentions: Mention[];
    onMentionClick: (mention: Mention) => void;
    onFlagMention: (mention: Mention) => void;
  };
}

// Individual row component
const MentionRow: React.FC<RowProps> = ({ index, style, data }) => {
  const { mentions, onMentionClick, onFlagMention } = data;
  const mention = mentions[index];

  if (!mention) {
    return (
      <div style={style} className="p-2">
        <Card className="animate-pulse">
          <CardContent className="p-4">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSentimentIcon = (sentiment: number | null) => {
    if (sentiment === null) return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (sentiment === -1) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (sentiment >= 51) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment <= 49) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getSentimentColor = (sentiment: number | null) => {
    if (sentiment === null) return 'bg-muted';
    if (sentiment === -1) return 'bg-gray-100';
    if (sentiment >= 51) return 'bg-green-100 text-green-800';
    if (sentiment <= 49) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getSentimentText = (sentiment: number | null) => {
    if (sentiment === null) return 'Pending';
    if (sentiment === -1) return 'Unknown';
    if (sentiment >= 51) return 'Positive';
    if (sentiment <= 49) return 'Negative';
    return 'Neutral';
  };

  const getEscalationIcon = (escalationType: string) => {
    switch (escalationType) {
      case 'pr':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'legal':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'crisis':
        return <Flag className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getEscalationColor = (escalationType: string) => {
    switch (escalationType) {
      case 'pr':
        return 'bg-blue-100 text-blue-800';
      case 'legal':
        return 'bg-red-100 text-red-800';
      case 'crisis':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div style={style} className="p-2">
      <Card 
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          mention.flagged && "border-red-200 bg-red-50"
        )}
        onClick={() => onMentionClick(mention)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">
                  {mention.source_name}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {mention.source_type}
                </Badge>
                {mention.flagged && (
                  <Badge variant="destructive" className="text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {mention.content_snippet}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(mention.published_at), { addSuffix: true })}
                </span>
                <span>•</span>
                <span>{mention.source_type}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="flex items-center gap-1">
                {getSentimentIcon(mention.sentiment)}
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getSentimentColor(mention.sentiment))}
                >
                  {getSentimentText(mention.sentiment)}
                </Badge>
              </div>
              
              {mention.escalation_type !== 'none' && (
                <div className="flex items-center gap-1">
                  {getEscalationIcon(mention.escalation_type)}
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getEscalationColor(mention.escalation_type))}
                  >
                    {mention.escalation_type.toUpperCase()}
                  </Badge>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlagMention(mention);
                }}
              >
                <Flag className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {mention.topics && mention.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {mention.topics.slice(0, 3).map((topic, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {mention.topics.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{mention.topics.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main virtualized table component
export const VirtualizedMentionsTable: React.FC<VirtualizedMentionsTableProps> = ({
  mentions,
  onMentionClick,
  onFlagMention,
  height = 600,
  itemHeight = 200,
  className
}) => {
  const [isScrolling, setIsScrolling] = useState(false);

  // Memoize the data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    mentions,
    onMentionClick,
    onFlagMention,
  }), [mentions, onMentionClick, onFlagMention]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    // Debounce scroll end
    setTimeout(() => setIsScrolling(false), 150);
  }, []);

  if (mentions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No mentions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isScrolling && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="text-xs">
            Scrolling...
          </Badge>
        </div>
      )}
      
      <List
        height={height}
        itemCount={mentions.length}
        itemSize={itemHeight}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={5} // Render 5 extra items for smooth scrolling
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {MentionRow}
      </List>
      
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Showing {mentions.length} mentions
      </div>
    </div>
  );
};

// Infinite scroll version for very large datasets
interface InfiniteVirtualizedMentionsTableProps extends VirtualizedMentionsTableProps {
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => void;
  totalCount: number;
}

export const InfiniteVirtualizedMentionsTable: React.FC<InfiniteVirtualizedMentionsTableProps> = ({
  mentions,
  onMentionClick,
  onFlagMention,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  totalCount,
  height = 600,
  itemHeight = 200,
  className
}) => {
  const [isScrolling, setIsScrolling] = useState(false);

  const itemData = useMemo(() => ({
    mentions,
    onMentionClick,
    onFlagMention,
  }), [mentions, onMentionClick, onFlagMention]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 150);
  }, []);

  // Load more when reaching the end
  const handleItemsRendered = useCallback(({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (visibleStopIndex >= mentions.length - 5 && hasNextPage && !isNextPageLoading) {
      loadNextPage();
    }
  }, [mentions.length, hasNextPage, isNextPageLoading, loadNextPage]);

  if (mentions.length === 0 && !isNextPageLoading) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No mentions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isScrolling && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="text-xs">
            Scrolling...
          </Badge>
        </div>
      )}
      
      <List
        height={height}
        itemCount={mentions.length + (hasNextPage ? 1 : 0)}
        itemSize={itemHeight}
        itemData={itemData}
        onScroll={handleScroll}
        onItemsRendered={handleItemsRendered}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {({ index, style, data }) => {
          // Show loading indicator for the last item if loading more
          if (index === mentions.length && hasNextPage) {
            return (
              <div style={style} className="p-2">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading more mentions...</p>
                  </CardContent>
                </Card>
              </div>
            );
          }
          
          return <MentionRow index={index} style={style} data={data} />;
        }}
      </List>
      
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Showing {mentions.length} of {totalCount} mentions
        {hasNextPage && " (scroll to load more)"}
      </div>
    </div>
  );
};
