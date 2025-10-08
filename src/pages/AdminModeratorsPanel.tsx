import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createApiUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserRole, type UserType } from "@/hooks/use-user-role";
import { AdminLayout } from "@/components/ui/admin-layout";

interface ModeratorUser {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  user_type: UserType;
  created_at: string;
  fetch_frequency_minutes: number;
}

export default function AdminModeratorsPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModerator, setSelectedModerator] = useState<ModeratorUser | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    full_name: '',
    email: '',
    phone_number: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Helper function to get badge variant for user types
  const getUserBadgeVariant = (userType: UserType) => {
    switch (userType) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchModerators();
    } else if (!roleLoading && !isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading]);

  const fetchModerators = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their roles and profiles using new backend API
      const response = await fetch(createApiUrl('/admin/users-with-roles?include_inactive=false'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      // Filter to only show moderators and admins
      const formattedModerators: ModeratorUser[] = result.data
        .filter((user: any) => user.user_type === 'moderator' || user.user_type === 'admin')
        .map((user: any) => ({
          id: user.id,
          email: user.email || 'No email',
          full_name: user.profile?.full_name || 'No name',
          phone_number: user.profile?.phone_number || null,
          user_type: user.user_type,
          created_at: user.created_at,
          fetch_frequency_minutes: user.profile?.fetch_frequency_minutes || 15
        }));

      setModerators(formattedModerators);
    } catch (error) {
      console.error("Error fetching moderator data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch moderator data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserType) => {
    try {
      // Get current user's role and the target user's current role
      const { userRole: currentUserRole } = useUserRole();
      const targetUser = moderators.find(m => m.id === userId);
      
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Role hierarchy validation
      if (currentUserRole === 'admin') {
        // Admins can only manage moderators and basic users, not other admins
        if (targetUser.user_type === 'admin') {
          toast({
            title: "Permission Denied",
            description: "Admins cannot modify other admin roles",
            variant: "destructive"
          });
          return;
        }
        
        // Admins cannot promote users to admin level
        if (newRole === 'admin') {
          toast({
            title: "Permission Denied", 
            description: "Only super admins can promote users to admin level",
            variant: "destructive"
          });
          return;
        }
      }

      const response = await fetch(createApiUrl(`/admin/user-roles/${userId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_type: newRole }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user role');
      }

      toast({
        title: "Success",
        description: "User role updated successfully"
      });
      
      fetchModerators(); // Refresh data
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const updateUserProfile = async (userId: string, profileData: typeof editingProfile) => {
    try {
      setIsUpdating(true);

      // Update profile information via backend endpoint
      const response = await fetch(createApiUrl('/admin/update-user-profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          fullName: profileData.full_name,
          phoneNumber: profileData.phone_number || null,
          email: profileData.email !== selectedModerator?.email ? profileData.email : null
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      toast({
        title: "Profile Updated",
        description: "Moderator profile updated successfully"
      });

      setEditMode(false);
      fetchModerators(); // Refresh data
    } catch (error: any) {
      console.error("Error updating moderator profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update moderator profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateUserFetchFrequency = async (userId: string, frequency: number) => {
    try {
      // Update fetch frequency via backend endpoint
      const response = await fetch(createApiUrl('/admin/update-user-profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          fetchFrequencyMinutes: frequency
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update fetch frequency');
      }

      toast({
        title: "Frequency Updated",
        description: `Fetch frequency set to ${frequency} minutes`
      });

      fetchModerators(); // Refresh data
    } catch (error: any) {
      console.error("Error updating fetch frequency:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update fetch frequency",
        variant: "destructive"
      });
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading moderator panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout 
      title="Moderator Management"
      description="Manage moderator and admin accounts"
      actions={
        <Button onClick={fetchModerators} variant="outline">
          Refresh Data
        </Button>
      }
    >

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Moderators & Admins ({moderators.length})
            </CardTitle>
            <CardDescription>
              View and manage moderator and admin user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Fetch Frequency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moderators.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium"
                        onClick={() => {
                          setSelectedModerator(user);
                          setEditingProfile({
                            full_name: user.full_name,
                            email: user.email,
                            phone_number: user.phone_number || ''
                          });
                          setEditMode(false);
                          setUserDetailOpen(true);
                        }}
                      >
                        {user.full_name}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getUserBadgeVariant(user.user_type)}>
                        {user.user_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={user.fetch_frequency_minutes.toString()} 
                          onValueChange={(value: string) => updateUserFetchFrequency(user.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5min</SelectItem>
                            <SelectItem value="10">10min</SelectItem>
                            <SelectItem value="15">15min</SelectItem>
                            <SelectItem value="30">30min</SelectItem>
                            <SelectItem value="60">1hr</SelectItem>
                            <SelectItem value="120">2hr</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={user.user_type} 
                        onValueChange={(value: UserType) => updateUserRole(user.id, value)}
                        disabled={isAdmin && user.user_type === 'admin'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic_user">Basic User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          {!isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Moderator Profile" : "Moderator Details"}
            </DialogTitle>
            <DialogDescription>
              {editMode 
                ? `Edit profile information for ${selectedModerator?.full_name}`
                : `View and manage profile for ${selectedModerator?.full_name}`
              }
            </DialogDescription>
          </DialogHeader>
          {selectedModerator && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      <p className="text-sm">{selectedModerator.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{selectedModerator.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                      <p className="text-sm">{selectedModerator.phone_number || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <p className="text-sm">
                        <Badge variant={getUserBadgeVariant(selectedModerator.user_type)}>
                          {selectedModerator.user_type.replace('_', ' ')}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setUserDetailOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={() => setEditMode(true)}>
                      Edit Profile
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="edit-fullname">Full Name</Label>
                      <Input
                        id="edit-fullname"
                        value={editingProfile.full_name}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingProfile.email}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        value={editingProfile.phone_number}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditMode(false);
                        setEditingProfile({
                          full_name: selectedModerator.full_name,
                          email: selectedModerator.email,
                          phone_number: selectedModerator.phone_number || ''
                        });
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateUserProfile(selectedModerator.id, editingProfile)}
                      disabled={isUpdating || !editingProfile.full_name.trim()}
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}