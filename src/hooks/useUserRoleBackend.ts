import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createApiUrl } from "@/lib/api";

export type UserType = 'admin' | 'moderator' | 'legal_user' | 'pr_user' | 'basic_user';

interface UserRoleData {
  user_type: UserType;
  created_at: string;
}

export function useUserRoleBackend() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setUserType(null);
          return;
        }

        // Use backend API instead of direct database access
        const response = await fetch(createApiUrl(`/admin/user-roles/${user.id}`));
        
        if (!response.ok) {
          if (response.status === 404) {
            // User has no role, default to basic_user
            setUserType('basic_user');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setUserType(result.data.user_type);
        } else {
          throw new Error(result.error || 'Failed to fetch user role');
        }
        
      } catch (error: any) {
        console.error("Error fetching user role:", error);
        setError(error.message);
        setUserType('basic_user'); // Default to basic user on error
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const hasAccess = (requiredLevel: UserType): boolean => {
    if (!userType) return false;
    
    const hierarchy: Record<UserType, number> = {
      'admin': 5,
      'moderator': 4,
      'legal_user': 3,
      'pr_user': 2,
      'basic_user': 1
    };

    return hierarchy[userType] >= hierarchy[requiredLevel];
  };

  const isModerator = hasAccess('moderator');
  const isLegalUser = hasAccess('legal_user');
  const isPRUser = hasAccess('pr_user');
  const isAdmin = hasAccess('admin');

  return {
    userType,
    loading,
    error,
    hasAccess,
    isModerator,
    isLegalUser,
    isPRUser,
    isAdmin
  };
}
