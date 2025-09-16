import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Flag, Clock, MessageCircle, UserX, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { cleanAndTruncate } from "@/lib/contentUtils";

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
  escalation_type: string | null;
  internal_notes: string | null;
  legal_escalated_at: string | null;
  pr_escalated_at: string | null;
}

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
}

function PaginationControls({ 
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
}) {
  // Add state for the input value
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Update input value when current page changes externally
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const pageSizeOptions = [10, 25, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-4 sm:gap-2">
      {/* Row 1 on mobile, Left side on desktop */}
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

      {/* Row 2 on mobile, Right side on desktop */}
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
            value={inputValue}
            onChange={(e) => {
              // Allow any number or empty input
              const newValue = e.target.value;
              setInputValue(newValue);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt(e.currentTarget.value);
                if (!isNaN(value)) {
                  if (value >= 1 && value <= totalPages) {
                    onPageChange(value);
                  }
                }
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              const value = parseInt(inputValue);
              if (!isNaN(value)) {
                if (value < 1) {
                  onPageChange(1);
                  setInputValue('1');
                } else if (value > totalPages) {
                  onPageChange(totalPages);
                  setInputValue(totalPages.toString());
                } else {
                  onPageChange(value);
                  setInputValue(value.toString());
                }
              } else {
                setInputValue(currentPage.toString());
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
}

export function MentionsTable({ 
  mentions, 
  onMentionClick, 
  getSentimentEmoji, 
  onNotMe,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}: MentionsTableProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const handlePageChange = (page: number) => {
    onPageChange(page);
  };

  const handlePageSizeChange = (size: number) => {
    onPageSizeChange(size);
    onPageChange(1);  // Reset to first page when changing page size
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment: number | null) => {
    if (sentiment === null) return 'bg-blue-100 text-blue-800 border-blue-200'; // Pending
    if (sentiment === -1) return 'bg-muted text-muted-foreground'; // Unknown
    if (sentiment === 50) return 'bg-warning/10 text-warning border-warning/20'; // Neutral (yellow)
    if (sentiment <= 49) return 'bg-destructive/10 text-destructive border-destructive/20'; // Negative (red)
    if (sentiment >= 51) return 'bg-success/10 text-success border-success/20'; // Positive (green)
    return 'bg-warning/10 text-warning border-warning/20'; // Default to neutral
  };

  const getSentimentLabel = (sentiment: number | null) => {
    if (sentiment === null) return 'Pending';
    if (sentiment === -1) return 'Unknown';
    if (sentiment === 50) return 'Neutral';
    if (sentiment <= 49) return 'Negative';
    if (sentiment >= 51) return 'Positive';
    return 'Neutral';
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
        {mentions.map((mention, index) => (
          <Card 
            key={mention.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onMentionClick(mention)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(mention.source_url, '_blank', 'noopener,noreferrer');
                    }}
                    aria-label="Open source"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNotMe(mention.id);
                    }}
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    <span className="text-xs">Not me</span>
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-foreground mb-3 line-clamp-2">
                {cleanAndTruncate(mention.cleaned_text || mention.content_snippet, 150)}
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
                  {mention.sentiment === null ? (
                    <span className="inline-flex items-center gap-1">
                      ⏳ <span className="text-blue-800">Pending</span>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} onClick={e => e.stopPropagation()}><Info className="h-3 w-3 text-blue-800 cursor-pointer" /></span>
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
                          <span tabIndex={0} onClick={e => e.stopPropagation()}><Info className="h-3 w-3 text-muted-foreground cursor-pointer" /></span>
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
                <TableRow 
                  key={mention.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onMentionClick(mention)}
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
                    <p className="truncate">{cleanAndTruncate(mention.cleaned_text || mention.content_snippet, 100)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
                      {mention.sentiment === null ? (
                        <span className="inline-flex items-center gap-1">
                          ⏳ <span className="text-blue-800">Pending</span>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} onClick={e => e.stopPropagation()}><Info className="h-3 w-3 text-blue-800 cursor-pointer" /></span>
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
                              <span tabIndex={0} onClick={e => e.stopPropagation()}><Info className="h-3 w-3 text-muted-foreground cursor-pointer" /></span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(mention.source_url, '_blank', 'noopener,noreferrer');
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onNotMe(mention.id);
                            }}
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
}