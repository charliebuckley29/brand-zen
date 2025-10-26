import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EnhancedStatusBadge } from "./enhanced-status-badge";
import { UserActionMenu } from "./user-action-menu";
import { Globe, Calendar, Settings } from "lucide-react";
import type { UserType } from "@/hooks/use-user-role";

interface User {
  id: string;
  email: string;
  full_name?: string; // Made optional to match ModeratorPanelSimple
  phone_number?: string | null; // Made optional to match ModeratorPanelSimple
  user_type: UserType;
  created_at: string;
  fetch_frequency_minutes?: number; // Made optional to match ModeratorPanelSimple
  email_confirmed?: boolean;
  email_confirmed_at?: string | null;
  brand_website?: string | null;
  brand_description?: string | null;
  social_media_links?: Record<string, string>;
  user_status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended'; // Now at top level
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  profile?: {
    full_name?: string;
    phone_number?: string | null;
    fetch_frequency_minutes?: number;
    automation_enabled?: boolean;
    timezone?: string;
    created_by_staff?: boolean;
    notification_preferences?: any;
    brand_website?: string | null;
    brand_description?: string | null;
    social_media_links?: Record<string, string>;
  };
}

interface EnhancedUserCardProps {
  user: User;
  onEdit: () => void;
  onConfigureAutomation: () => void;
  onDelete: () => void;
  onPasswordReset: () => void;
  onEmailResend: () => void;
  onRoleChange: (role: UserType) => void;
  onFrequencyChange: (frequency: number) => void;
  loadingStates: {
    deleting: boolean;
    passwordReset: boolean;
    emailResend: boolean;
  };
  canEdit: boolean;
  canDelete: boolean;
}

export function EnhancedUserCard({
  user,
  onEdit,
  onConfigureAutomation,
  onDelete,
  onPasswordReset,
  onEmailResend,
  onRoleChange,
  onFrequencyChange,
  loadingStates,
  canEdit,
  canDelete
}: EnhancedUserCardProps) {

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return '??';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header Section */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(user.full_name || user.profile?.full_name || user.email)}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base truncate">
                  {user.full_name || user.profile?.full_name || user.email}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('🔧 [ENHANCED_USER_CARD] Automation button clicked for user:', user.id, user.full_name);
                    console.log('🔧 [ENHANCED_USER_CARD] User object properties:', Object.keys(user));
                    console.log('🔧 [ENHANCED_USER_CARD] User object:', user);
                    console.log('🔧 [ENHANCED_USER_CARD] onConfigureAutomation function:', typeof onConfigureAutomation, onConfigureAutomation);
                    if (typeof onConfigureAutomation === 'function') {
                      onConfigureAutomation();
                    } else {
                      console.error('🔧 [ENHANCED_USER_CARD] onConfigureAutomation is not a function:', onConfigureAutomation);
                    }
                  }}
                  className="min-w-[44px] min-h-[44px] md:min-w-auto md:min-h-auto"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Automation</span>
                </Button>
                <UserActionMenu
                  user={user}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPasswordReset={onPasswordReset}
                  onEmailResend={onEmailResend}
                  onRoleChange={onRoleChange}
                  onFrequencyChange={onFrequencyChange}
                  loadingStates={loadingStates}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <EnhancedStatusBadge 
                type="email" 
                status={user.email_confirmed} 
                size="sm"
              />
              <EnhancedStatusBadge 
                type="approval" 
                status={user.user_status || user.profile?.user_status || 'pending_approval'} 
                size="sm"
              />
              <EnhancedStatusBadge 
                type="role" 
                status={user.user_type} 
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(user.created_at)}</span>
          </div>
          {user.brand_website && (
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="truncate max-w-[120px]">
                {new URL(user.brand_website).hostname}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
