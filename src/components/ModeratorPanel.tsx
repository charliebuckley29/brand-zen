import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flag, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import type { UserType } from "@/hooks/use-user-role";
import { GlobalSettingSwitch } from "@/components/GlobalSettingSwitch";

interface User {
  id: string;
  email: string;
  user_type: UserType;
  created_at: string;
}

interface UserKeywords {
  id: string;
  user_id: string;
  brand_name: string;
  variants: string[] | null;
  google_alert_rss_url: string | null;
  google_alerts_enabled: boolean;
  user_email: string;
}

interface FlaggedMention {
  id: string;
  user_id: string;
  source_url: string;
  source_name: string;
  content_snippet: string;
  sentiment: number;
  flagged: boolean;
  created_at: string;
  user_email: string;
}

export function ModeratorPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [userKeywords, setUserKeywords] = useState<UserKeywords[]>([]);
  const [flaggedMentions, setFlaggedMentions] = useState<FlaggedMention[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their roles
      const { data: usersData, error: usersError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          user_type,
          created_at
        `);

      if (usersError) throw usersError;

      // Get user emails from auth.users via a function call (since we can't query auth.users directly)
      const userEmails: Record<string, string> = {};
      for (const user of usersData || []) {
        // For now, we'll show user IDs. In production, you'd want to create a profiles table
        userEmails[user.user_id] = user.user_id;
      }

      const formattedUsers: User[] = (usersData || []).map(user => ({
        id: user.user_id,
        email: userEmails[user.user_id] || 'Unknown',
        user_type: user.user_type,
        created_at: user.created_at
      }));

      // Fetch user keywords with brand info
      const { data: keywordsData, error: keywordsError } = await supabase
        .from("keywords")
        .select(`
          id,
          user_id,
          brand_name,
          variants,
          google_alert_rss_url,
          google_alerts_enabled
        `);

      if (keywordsError) throw keywordsError;

      const formattedKeywords: UserKeywords[] = (keywordsData || []).map(keyword => ({
        ...keyword,
        user_email: userEmails[keyword.user_id] || 'Unknown'
      }));

      // Fetch flagged mentions
      const { data: mentionsData, error: mentionsError } = await supabase
        .from("mentions")
        .select(`
          id,
          user_id,
          source_url,
          source_name,
          content_snippet,
          sentiment,
          flagged,
          created_at
        `)
        .eq("flagged", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (mentionsError) throw mentionsError;

      const formattedMentions: FlaggedMention[] = (mentionsData || []).map(mention => ({
        ...mention,
        user_email: userEmails[mention.user_id] || 'Unknown'
      }));

      setUsers(formattedUsers);
      setUserKeywords(formattedKeywords);
      setFlaggedMentions(formattedMentions);
    } catch (error) {
      console.error("Error fetching moderator data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch moderator panel data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserType) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ user_type: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully"
      });
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const updateUserBrand = async (keywordId: string, brandName: string, variants: string, rssUrl: string) => {
    try {
      const variantsArray = variants.split(',').map(v => v.trim()).filter(v => v);
      
      const { error } = await supabase
        .from("keywords")
        .update({ 
          brand_name: brandName,
          variants: variantsArray,
          google_alert_rss_url: rssUrl || null
        })
        .eq("id", keywordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand information updated successfully"
      });
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating brand:", error);
      toast({
        title: "Error",
        description: "Failed to update brand information",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading moderator panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Moderator Panel</h1>
          <p className="text-muted-foreground">
            Manage users, monitor flagged mentions, and configure brand settings
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Flagged Mentions ({flaggedMentions.length})
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Brand Management ({userKeywords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">{user.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant={user.user_type === 'moderator' ? 'default' : 'secondary'}>
                          {user.user_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select 
                          value={user.user_type} 
                          onValueChange={(value: UserType) => updateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic_user">Basic User</SelectItem>
                            <SelectItem value="pr_user">PR User</SelectItem>
                            <SelectItem value="legal_user">Legal User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Mentions</CardTitle>
              <CardDescription>
                Review mentions that have been flagged for attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flaggedMentions.map((mention) => (
                  <div key={mention.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="font-medium">{mention.source_name}</span>
                        <Badge variant="destructive">Flagged</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(mention.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{mention.content_snippet}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>User: {mention.user_email}</span>
                      <a 
                        href={mention.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Source
                      </a>
                    </div>
                  </div>
                ))}
                {flaggedMentions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No flagged mentions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
              <CardDescription>
                Configure global application settings that affect all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Allow users to change brand names</Label>
                    <p className="text-sm text-muted-foreground">
                      When disabled, basic users cannot modify their brand names or variants
                    </p>
                  </div>
                  <GlobalSettingSwitch 
                    settingKey="usersCanChangeBrandName"
                    onUpdate={fetchData}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface BrandEditorProps {
  keyword: UserKeywords;
  onUpdate: (keywordId: string, brandName: string, variants: string, rssUrl: string) => void;
}

function BrandEditor({ keyword, onUpdate }: BrandEditorProps) {
  const [brandName, setBrandName] = useState(keyword.brand_name);
  const [variants, setVariants] = useState(keyword.variants?.join(', ') || '');
  const [rssUrl, setRssUrl] = useState(keyword.google_alert_rss_url || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(keyword.id, brandName, variants, rssUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setBrandName(keyword.brand_name);
    setVariants(keyword.variants?.join(', ') || '');
    setRssUrl(keyword.google_alert_rss_url || '');
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Brand: {keyword.brand_name}</h4>
          <p className="text-sm text-muted-foreground">User: {keyword.user_email}</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-4">
          <div>
            <Label htmlFor={`brand-${keyword.id}`}>Brand Name</Label>
            <Input
              id={`brand-${keyword.id}`}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`variants-${keyword.id}`}>Variants (comma-separated)</Label>
            <Input
              id={`variants-${keyword.id}`}
              value={variants}
              onChange={(e) => setVariants(e.target.value)}
              placeholder="variant1, variant2, variant3"
            />
          </div>
          <div>
            <Label htmlFor={`rss-${keyword.id}`}>Google Alert RSS URL</Label>
            <Textarea
              id={`rss-${keyword.id}`}
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://www.google.com/alerts/feeds/..."
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium">Variants: </span>
            <span className="text-sm">{keyword.variants?.join(', ') || 'None'}</span>
          </div>
          <div>
            <span className="text-sm font-medium">Google Alert RSS: </span>
            <span className="text-sm">
              {keyword.google_alert_rss_url ? (
                <a 
                  href={keyword.google_alert_rss_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Configured
                </a>
              ) : (
                'Not configured'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}