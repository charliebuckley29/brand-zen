import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function DebugMentions() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runDebugCheck = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);

      // Count mentions visible to user
      const { data: visibleMentions, error: visibleError } = await supabase
        .from('mentions')
        .select('user_id, id, source_name')
        .limit(10);

      if (visibleError) throw visibleError;

      // Count total mentions for current user specifically
      const { data: userMentions, error: userError } = await supabase
        .from('mentions')
        .select('id')
        .eq('user_id', user?.id || '');

      if (userError) throw userError;

      // Test delete operation
      const { error: testDeleteError } = await supabase
        .from('mentions')
        .delete()
        .eq('user_id', user?.id || '')
        .eq('id', 'non-existent-id'); // This should not delete anything

      const debugData = {
        currentUserId: user?.id,
        visibleMentionsCount: visibleMentions?.length || 0,
        visibleMentionsSample: visibleMentions?.slice(0, 5) || [],
        userMentionsCount: userMentions?.length || 0,
        testDeleteError: testDeleteError?.message || 'No error',
        uniqueUserIds: [...new Set(visibleMentions?.map(m => m.user_id) || [])]
      };

      setDebugInfo(debugData);
      console.log('Debug info:', debugData);

    } catch (error) {
      console.error('Debug check failed:', error);
      toast({
        title: 'Debug failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Debug Mentions</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={runDebugCheck}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          {loading ? 'Checking...' : 'Run Debug Check'}
        </Button>
        
        {debugInfo && (
          <div className="mt-4 space-y-2 text-xs">
            <div><strong>Current User ID:</strong> {debugInfo.currentUserId}</div>
            <div><strong>Visible Mentions:</strong> {debugInfo.visibleMentionsCount}</div>
            <div><strong>User's Mentions:</strong> {debugInfo.userMentionsCount}</div>
            <div><strong>Unique User IDs in visible mentions:</strong> {debugInfo.uniqueUserIds.join(', ')}</div>
            <div><strong>Sample mentions:</strong></div>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(debugInfo.visibleMentionsSample, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}