import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RefreshCw, Trash2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExclusionsModal } from "./ExclusionsModal";

interface MonitoringControlsProps {
  onMentionsUpdated: () => void;
}

export function MonitoringControls({ onMentionsUpdated }: MonitoringControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [exclusionsOpen, setExclusionsOpen] = useState(false);
  const { toast } = useToast();

  const handleRefreshMentions = async () => {
    try {
      setIsRefreshing(true);
      await Promise.allSettled([
        supabase.functions.invoke('aggregate-sources', { body: {} }),
        supabase.functions.invoke('monitor-news', { body: {} }),
      ]);
      await onMentionsUpdated();
      toast({ title: 'Mentions refreshed', description: 'Fetched latest mentions.' });
    } catch (err) {
      console.error('Error refreshing mentions:', err);
      toast({ title: 'Refresh failed', description: 'Could not fetch new mentions.', variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearMentions = async () => {
    try {
      setIsClearing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Not signed in', description: 'Please sign in to clear mentions.', variant: 'destructive' });
        return;
      }
      const { error } = await supabase
        .from('mentions')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      await onMentionsUpdated();
      toast({ title: 'Mentions cleared', description: 'All your mentions were removed.' });
    } catch (err) {
      console.error('Error clearing mentions:', err);
      toast({ title: 'Clear failed', description: 'Could not delete mentions.', variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Monitoring Controls
        </CardTitle>
        <CardDescription>
          Mentions make the world go round...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button 
            onClick={handleRefreshMentions}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh mentions
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setExclusionsOpen(true)}
            className="w-full sm:w-auto"
          >
            <History className="w-4 h-4 mr-2" />
            See removed mentions
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={isClearing}
                className="w-full sm:w-auto"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear mentions
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All found mentions will be permanently deleted from our database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearMentions}>
                  Yes, clear all mentions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>Use the controls to fetch the latest mentions, clear all current mentions, or review any removed mentions that have been marked as not you.</p>
        </div>
        <ExclusionsModal open={exclusionsOpen} onOpenChange={setExclusionsOpen} />
      </CardContent>
    </Card>
  );
}