import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Search, Bug, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QueueStatusWidget } from "./QueueStatusWidget";
import { QueueHistoryWidget } from "./QueueHistoryWidget";

interface UserQueueModalProps {
  userId: string;
}

export function UserQueueModal({ userId }: UserQueueModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          My Queue Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            My Queue Activity
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="sr-only">
          View your personal queue status and monitoring activity history.
        </DialogDescription>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                My Activity
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Technical Details
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-6 mt-4">
              {/* User-Centric Overview */}
              <div className="space-y-6">
                {/* Current Queue Status */}
                <QueueStatusWidget userId={userId} />
                
                {/* Queue History */}
                <QueueHistoryWidget userId={userId} limit={10} />
              </div>
            </TabsContent>
            
            <TabsContent value="technical" className="flex-1 overflow-y-auto space-y-4 mt-4">
              {/* Technical Debug Information */}
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Bug className="h-5 w-5" />
                    Technical Debug Information
                  </h3>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <p>This section contains technical details for debugging purposes.</p>
                    <p>For user-friendly monitoring information, use the "My Activity" tab.</p>
                  </div>
                </div>

                {/* Raw Queue Data */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Raw Queue Data
                  </h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Raw queue data and system logs would be displayed here for technical debugging.
                      This includes detailed API processing logs, error traces, and system metrics.
                    </p>
                  </div>
                </div>

                {/* System Statistics */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    System Statistics
                  </h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      System-wide statistics and performance metrics would be displayed here.
                      This includes queue processing times, API usage statistics, and error rates.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

