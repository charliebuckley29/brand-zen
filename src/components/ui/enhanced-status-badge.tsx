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
  Crown
} from "lucide-react";

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  description: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  email_confirmed: {
    icon: MailCheck,
    color: "text-green-600 bg-green-50 border-green-200",
    label: "Confirmed",
    description: "Email verified"
  },
  email_unconfirmed: {
    icon: Mail,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    label: "Unconfirmed", 
    description: "Email pending verification"
  },
  approved: {
    icon: CheckCircle,
    color: "text-green-600 bg-green-50 border-green-200",
    label: "Approved",
    description: "Account active"
  },
  pending_approval: {
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    label: "Pending",
    description: "Awaiting approval"
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "Rejected",
    description: "Account rejected"
  },
  suspended: {
    icon: AlertTriangle,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "Suspended",
    description: "Account suspended"
  },
  admin: {
    icon: Crown,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    label: "Admin",
    description: "Administrator"
  },
  moderator: {
    icon: Shield,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    label: "Moderator",
    description: "Moderator privileges"
  },
  basic_user: {
    icon: User,
    color: "text-gray-600 bg-gray-50 border-gray-200",
    label: "User",
    description: "Basic user"
  }
};

interface EnhancedStatusBadgeProps {
  type: 'email' | 'approval' | 'role';
  status: string | boolean;
  showIcon?: boolean;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EnhancedStatusBadge({ 
  type, 
  status, 
  showIcon = true, 
  showDescription = false,
  size = 'md',
  className 
}: EnhancedStatusBadgeProps) {
  const getStatusKey = () => {
    if (type === 'email') {
      return status ? 'email_confirmed' : 'email_unconfirmed';
    }
    if (type === 'approval') {
      return typeof status === 'string' ? status : 'pending_approval';
    }
    if (type === 'role') {
      return typeof status === 'string' ? status : 'basic_user';
    }
    return 'pending_approval';
  };

  const statusKey = getStatusKey();
  const config = statusConfigs[statusKey];
  
  if (!config) {
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

  return (
    <div className="flex flex-col gap-1">
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
      {showDescription && (
        <span className="text-xs text-muted-foreground">
          {config.description}
        </span>
      )}
    </div>
  );
}


