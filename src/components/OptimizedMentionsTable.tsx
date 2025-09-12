import React, { memo, useMemo, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Flag, Clock, MessageCircle, UserX, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cleanAndTruncate } from "@/lib/contentUtils";
import { Mention } from "@/types";
import { usePerformanceMonitor } from "@/hooks/usePerformance";

interface MentionsTableProps {
  mentions: Mention[];
  onMentionClick: (mention: Mention) => void;
  getSentimentEmoji: (sentiment: number | null) => string;
  onNotMe: (mentionId: string) => void;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
}

// Memoized pagination controls component
const PaginationControls = memo(({ 
  currentPage, 
  totalPages, 
  pageSize, 
  totalItems, 
  startIndex, 
  endIndex,
  onPageChange, 
  onPageSizeChange 
}: { 
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-4 sm:gap-2">
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map(size => (
              <SelectItem key={size} value={size.toString()}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>

        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt(e.currentTarget.value);
                if (!isNaN(value) && value >= 1 && value <= totalPages) {
                  onPageChange(value);
                }
                e.currentTarget.blur();
              }
            }}
            className="w-12 h-8 rounded-md border border-input bg-background px-1 text-sm text-center"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">/ {totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

PaginationControls.displayName = 'PaginationControls';

// Memoized mention row component
const MentionRow = memo(({ 
  mention, 
  index, 
  startIndex, 
  onMentionClick, 
  getSentimentEmoji, 
  onNotMe, 
  getSentimentColor, 
  getSentimentLabel, 
  formatDate 
}: {
  mention: Mention;
  index: number;
  startIndex: number;
  onMentionClick: (mention: Mention) => void;
  getSentimentEmoji: (sentiment: number | null) => string;
  onNotMe: (mentionId: string) => void;
  getSentimentColor: (sentiment: number | null) => string;
  getSentimentLabel: (sentiment: number | null) => string;
  formatDate: (dateString: string) => string;
}) => {
  const handleMentionClick = useCallback(() => {
    onMentionClick(mention);
  }, [mention, onMentionClick]);

  const handleNotMe = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNotMe(mention.id);
  }, [mention.id, onNotMe]);

  const handleExternalLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(mention.source_url, '_blank', 'noopener,noreferrer');
  }, [mention.source_url]);

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={handleMentionClick}
    >
      <TableCell className="text-muted-foreground text-sm text-right tabular-nums">
        {startIndex + index + 1}
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="truncate">{cleanAndTruncate(mention.source_name, 60)}</span>
          {mention.flagged && <Flag className="h-4 w-4 text-warning" />}
        </div>
      </TableCell>
      <TableCell className="max-w-md">
        <p className="truncate">{cleanAndTruncate(mention.content_snippet, 100)}</p>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
          {mention.sentiment === null ? (
            <span className="inline-flex items-center gap-1">
              ⏳ <span className="text-blue-800">Pending</span>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} onClick={e => e.stopPropagation()}>
                    <Info className="h-3 w-3 text-blue-800 cursor-pointer" />
                  </span>
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
                  <span tabIndex={0} onClick={e => e.stopPropagation()}>
                    <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Sentiment is unknown because there wasn't enough context to analyze this mention.
                </TooltipContent>
              </Tooltip>
            </span>
          ) : (
            <>
              {getSentimentEmoji(mention.sentiment)} {getSentimentLabel(mention.sentiment)}
            </>
          )}
        </Badge>
      </TableCell>
      <TableCell>
        {mention.escalation_type && mention.escalation_type !== 'none' && (
          <Badge variant="destructive" className="text-xs">
            {mention.escalation_type.toUpperCase()}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(mention.published_at)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExternalLink}
                aria-label="Open source"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open the source in a new tab</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotMe}
                aria-label="Not me"
              >
                <UserX className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>This mention isn't me - stop monitoring it</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
});

MentionRow.displayName = 'MentionRow';

// Memoized mobile card component
const MentionCard = memo(({ 
  mention, 
  index, 
  startIndex, 
  onMentionClick, 
  getSentimentEmoji, 
  onNotMe, 
  getSentimentColor, 
  getSentimentLabel, 
  formatDate 
}: {
  mention: Mention;
  index: number;
  startIndex: number;
  onMentionClick: (mention: Mention) => void;
  getSentimentEmoji: (sentiment: number | null) => string;
  onNotMe: (mentionId: string) => void;
  getSentimentColor: (sentiment: number | null) => string;
  getSentimentLabel: (sentiment: number | null) => string;
  formatDate: (dateString: string) => string;
}) => {
  const handleMentionClick = useCallback(() => {
    onMentionClick(mention);
  }, [mention, onMentionClick]);

  const handleNotMe = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNotMe(mention.id);
  }, [mention.id, onNotMe]);

  const handleExternalLink = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(mention.source_url, '_blank', 'noopener,noreferrer');
  }, [mention.source_url]);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleMentionClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">#{startIndex + index + 1}</span>
            <span className="font-medium text-sm">{cleanAndTruncate(mention.source_name, 60)}</span>
            {mention.flagged && <Flag className="h-3 w-3 text-warning" />}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleExternalLink}
              aria-label="Open source"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={handleNotMe}
            >
              <UserX className="h-3 w-3 mr-1" />
              <span className="text-xs">Not me</span>
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-foreground mb-3 line-clamp-2">
          {cleanAndTruncate(mention.content_snippet, 150)}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
            {mention.sentiment === null ? (
              <span className="inline-flex items-center gap-1">
                ⏳ <span className="text-blue-800">Pending</span>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} onClick={e => e.stopPropagation()}>
                      <Info className="h-3 w-3 text-blue-800 cursor-pointer" />
                    </span>
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
                    <span tabIndex={0} onClick={e => e.stopPropagation()}>
                      <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Sentiment is unknown because there wasn't enough context to analyze this mention.
                  </TooltipContent>
                </Tooltip>
              </span>
            ) : (
              <>
                {getSentimentEmoji(mention.sentiment)} {getSentimentLabel(mention.sentiment)}
              </>
            )}
          </Badge>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(mention.published_at)}
          </div>
        </div>
        
        {mention.escalation_type && mention.escalation_type !== 'none' && (
          <Badge variant="destructive" className="text-xs">
            {mention.escalation_type.toUpperCase()}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
});

MentionCard.displayName = 'MentionCard';

export const OptimizedMentionsTable = memo(({ 
  mentions, 
  onMentionClick, 
  getSentimentEmoji, 
  onNotMe,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  loading = false
}: MentionsTableProps) => {
  usePerformanceMonitor('OptimizedMentionsTable');

  const totalPages = useMemo(() => Math.ceil(totalItems / pageSize), [totalItems, pageSize]);
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const endIndex = useMemo(() => startIndex + pageSize, [startIndex, pageSize]);

  const handlePageChange = useCallback((page: number) => {
    onPageChange(page);
  }, [onPageChange]);

  const handlePageSizeChange = useCallback((size: number) => {
    onPageSizeChange(size);
    onPageChange(1); // Reset to first page when changing page size
  }, [onPageSizeChange, onPageChange]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getSentimentColor = useCallback((sentiment: number | null) => {
    if (sentiment === null) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (sentiment === -1) return 'bg-muted text-muted-foreground';
    if (sentiment === 50) return 'bg-warning/10 text-warning border-warning/20';
    if (sentiment <= 49) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (sentiment >= 51) return 'bg-success/10 text-success border-success/20';
    return 'bg-warning/10 text-warning border-warning/20';
  }, []);

  const getSentimentLabel = useCallback((sentiment: number | null) => {
    if (sentiment === null) return 'Pending';
    if (sentiment === -1) return 'Unknown';
    if (sentiment === 50) return 'Neutral';
    if (sentiment <= 49) return 'Negative';
    if (sentiment >= 51) return 'Positive';
    return 'Neutral';
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading mentions...</p>
      </div>
    );
  }

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
        {mentions.map((mention, index) => (
          <MentionCard
            key={mention.id}
            mention={mention}
            index={index}
            startIndex={startIndex}
            onMentionClick={onMentionClick}
            getSentimentEmoji={getSentimentEmoji}
            onNotMe={onNotMe}
            getSentimentColor={getSentimentColor}
            getSentimentLabel={getSentimentLabel}
            formatDate={formatDate}
          />
        ))}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[140px]">Source</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-[130px]">Sentiment</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[140px]">Date Found</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentions.map((mention, index) => (
                <MentionRow
                  key={mention.id}
                  mention={mention}
                  index={index}
                  startIndex={startIndex}
                  onMentionClick={onMentionClick}
                  getSentimentEmoji={getSentimentEmoji}
                  onNotMe={onNotMe}
                  getSentimentColor={getSentimentColor}
                  getSentimentLabel={getSentimentLabel}
                  formatDate={formatDate}
                />
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </>
  );
});

OptimizedMentionsTable.displayName = 'OptimizedMentionsTable';
