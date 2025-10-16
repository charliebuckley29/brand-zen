import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MoreHorizontal, 
  Edit, 
  Key, 
  Mail, 
  Trash2, 
  Shield, 
  Clock,
  User
} from "lucide-react";
import type { UserType } from "@/hooks/use-user-role";

interface UserActionMenuProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    user_type: UserType;
    email_confirmed?: boolean;
    user_status?: string;
    fetch_frequency_minutes: number;
  };
  onEdit: () => void;
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

export function UserActionMenu({
  user,
  onEdit,
  onDelete,
  onPasswordReset,
  onEmailResend,
  onRoleChange,
  onFrequencyChange,
  loadingStates,
  canEdit,
  canDelete
}: UserActionMenuProps) {
  
  // Determine primary action based on user state
  const getPrimaryAction = () => {
    if (!user.email_confirmed) {
      return {
        icon: Mail,
        label: "Resend Email",
        action: onEmailResend,
        loading: loadingStates.emailResend,
        variant: "outline" as const
      };
    }
    
    if (user.user_status === 'pending_approval') {
      return {
        icon: Shield,
        label: "Approve",
        action: onEdit,
        loading: false,
        variant: "default" as const
      };
    }
    
    return {
      icon: Edit,
      label: "Edit",
      action: onEdit,
      loading: false,
      variant: "outline" as const
    };
  };

  const primaryAction = getPrimaryAction();
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Primary Action Button */}
      <Button
        size="sm"
        variant={primaryAction.variant}
        onClick={primaryAction.action}
        disabled={primaryAction.loading || !canEdit}
        className="min-w-[44px] min-h-[44px] md:min-w-auto md:min-h-auto"
      >
        <PrimaryIcon className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">{primaryAction.label}</span>
      </Button>

      {/* Secondary Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[44px] min-h-[44px] md:min-w-auto md:min-h-auto"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Email Actions */}
          {!user.email_confirmed && (
            <DropdownMenuItem onClick={onEmailResend} disabled={loadingStates.emailResend}>
              <Mail className="h-4 w-4 mr-2" />
              {loadingStates.emailResend ? "Sending..." : "Resend Email"}
            </DropdownMenuItem>
          )}
          
          {/* Password Reset */}
          <DropdownMenuItem onClick={onPasswordReset} disabled={loadingStates.passwordReset}>
            <Key className="h-4 w-4 mr-2" />
            {loadingStates.passwordReset ? "Sending..." : "Reset Password"}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Role Management */}
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Role</span>
            </div>
            <Select 
              value={user.user_type} 
              onValueChange={(value: UserType) => onRoleChange(value)}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic_user">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Basic User
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Moderator
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Fetch Frequency */}
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Frequency</span>
            </div>
            <Select 
              value={(user.fetch_frequency_minutes || 60).toString()} 
              onValueChange={(value: string) => onFrequencyChange(parseInt(value))}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Delete Action */}
          {canDelete && (
            <DropdownMenuItem 
              onClick={onDelete} 
              disabled={loadingStates.deleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loadingStates.deleting ? "Deleting..." : "Delete User"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


