import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  MailCheck, 
  Mail, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Shield,
  User,
  Crown,
  Wifi,
  WifiOff,
  Activity,
  Pause,
  Play,
  Square
} from "lucide-react";

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  description: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  // Email Status
  email_confirmed: {
    icon: MailCheck,
    color: "text-success-600 bg-success-50 border-success-200",
    label: "Confirmed",
    description: "Email verified"
  },
  email_unconfirmed: {
    icon: Mail,
    color: "text-warning-600 bg-warning-50 border-warning-200",
    label: "Unconfirmed", 
    description: "Email pending verification"
  },

  // User Status
  approved: {
    icon: CheckCircle,
    color: "text-success-600 bg-success-50 border-success-200",
    label: "Approved",
    description: "Account active"
  },
  pending_approval: {
    icon: Clock,
    color: "text-warning-600 bg-warning-50 border-warning-200",
    label: "Pending",
    description: "Awaiting approval"
  },
  rejected: {
    icon: XCircle,
    color: "text-danger-600 bg-danger-50 border-danger-200",
    label: "Rejected",
    description: "Account rejected"
  },
  suspended: {
    icon: AlertTriangle,
    color: "text-danger-600 bg-danger-50 border-danger-200",
    label: "Suspended",
    description: "Account suspended"
  },

  // User Roles
  admin: {
    icon: Crown,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    label: "Admin",
    description: "Administrator privileges"
  },
  moderator: {
    icon: Shield,
    color: "text-info-600 bg-info-50 border-info-200",
    label: "Moderator",
    description: "Moderator privileges"
  },
  basic_user: {
    icon: User,
    color: "text-gray-600 bg-gray-50 border-gray-200",
    label: "User",
    description: "Basic user privileges"
  },

  // System Status
  online: {
    icon: Wifi,
    color: "text-success-600 bg-success-50 border-success-200",
    label: "Online",
    description: "System online"
  },
  offline: {
    icon: WifiOff,
    color: "text-danger-600 bg-danger-50 border-danger-200",
    label: "Offline",
    description: "System offline"
  },
  active: {
    icon: Activity,
    color: "text-success-600 bg-success-50 border-success-200",
    label: "Active",
    description: "Currently active"
  },
  paused: {
    icon: Pause,
    color: "text-warning-600 bg-warning-50 border-warning-200",
    label: "Paused",
    description: "Temporarily paused"
  },
  stopped: {
    icon: Square,
    color: "text-danger-600 bg-danger-50 border-danger-200",
    label: "Stopped",
    description: "Currently stopped"
  }
};

interface StatusIndicatorProps {
  status: string;
  showIcon?: boolean;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'dot' | 'full';
  className?: string;
}

export function StatusIndicator({ 
  status, 
  showIcon = true, 
  showDescription = false,
  size = 'md',
  variant = 'badge',
  className 
}: StatusIndicatorProps) {
  const config = statusConfigs[status];
  
  if (!config) {
    console.warn(`Unknown status: ${status}`);
    return null;
  }

  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  if (variant === 'dot') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-full h-2 w-2",
          config.color.includes('success') && "bg-success-500",
          config.color.includes('warning') && "bg-warning-500",
          config.color.includes('danger') && "bg-danger-500",
          config.color.includes('info') && "bg-info-500"
        )} />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <Badge 
          variant="outline" 
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            config.color,
            sizeClasses[size]
          )}
        >
          {showIcon && <Icon className={iconSizes[size]} />}
          {config.label}
        </Badge>
        {showDescription && (
          <span className="text-xs text-muted-foreground">
            {config.description}
          </span>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// Specialized status indicators for common use cases
export function EmailStatusIndicator({ 
  confirmed, 
  size = 'sm',
  className 
}: { 
  confirmed: boolean; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <StatusIndicator
      status={confirmed ? 'email_confirmed' : 'email_unconfirmed'}
      size={size}
      className={className}
    />
  );
}

export function UserStatusIndicator({ 
  status, 
  size = 'sm',
  className 
}: { 
  status: string; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <StatusIndicator
      status={status}
      size={size}
      className={className}
    />
  );
}

export function UserRoleIndicator({ 
  role, 
  size = 'sm',
  className 
}: { 
  role: string; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <StatusIndicator
      status={role}
      size={size}
      className={className}
    />
  );
}

export function SystemStatusIndicator({ 
  status, 
  size = 'sm',
  className 
}: { 
  status: string; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <StatusIndicator
      status={status}
      size={size}
      className={className}
    />
  );
}


