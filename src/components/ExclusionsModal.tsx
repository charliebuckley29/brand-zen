import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getUserExclusions, reAllowExclusion } from "@/lib/monitoring";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, RotateCcw } from "lucide-react";

interface ExclusionItem {
  id: string;
  source_url: string;
  source_domain: string | null;
  keyword_id: string;
  reason: string;
  created_at: string;
}

interface ExclusionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExclusionsModal({ open, onOpenChange }: ExclusionsModalProps) {
  const [items, setItems] = useState<ExclusionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserExclusions();
        setItems(data as ExclusionItem[]);
      } catch (err) {
        console.error("Failed to load exclusions", err);
        toast({ title: "Couldn’t load", description: "Failed to load removed mentions.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, toast]);

  const handleReadd = async (item: ExclusionItem) => {
    try {
      setActionId(item.id);
      await reAllowExclusion(item.id, item.keyword_id);
      setItems(prev => prev.filter(x => x.id !== item.id));
      toast({ title: "Re-allowed", description: "We’ll include this source again. Refresh mentions to pull it back." });
    } catch (err) {
      console.error("Failed to re-allow exclusion", err);
      toast({ title: "Action failed", description: "Couldn’t re-add this mention.", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Removed mentions</DialogTitle>
          <DialogDescription>Items you marked as “Not me”. You can re-add them anytime.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No removed mentions.</div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-2">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 rounded-md border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.source_domain && (
                        <Badge variant="secondary" className="text-xs">{item.source_domain}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm hover:underline break-all"
                      title={item.source_url}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.source_url}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(item.source_url, "_blank", "noopener,noreferrer")}
                      aria-label="Open source"
                      className="p-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleReadd(item)}
                      disabled={actionId === item.id}
                      className="px-3 py-2 min-w-[80px]"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Re-add
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
