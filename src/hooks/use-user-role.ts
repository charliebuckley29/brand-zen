import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/config/environment";

export type UserType = 'admin' | 'moderator' | 'legal_user' | 'pr_user' | 'basic_user';

export function useUserRole() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("🔍 useUserRole: Starting to fetch user role...");
        
        const { data: { user } } = await supabase.auth.getUser();
        console.log("🔍 useUserRole: Supabase user:", user);
        
        if (!user) {
          console.log("🔍 useUserRole: No user found, setting userType to null");
          setUserType(null);
          return;
        }

        console.log("🔍 useUserRole: User ID:", user.id);
        console.log("🔍 useUserRole: Backend URL:", config.api.backendUrl);
        
        const apiUrl = `${config.api.backendUrl}/admin/user-roles/${user.id}`;
        console.log("🔍 useUserRole: Making API call to:", apiUrl);
        
        // Use backend API instead of direct database access
        const response = await fetch(apiUrl);
        
        console.log("🔍 useUserRole: API response status:", response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log("🔍 useUserRole: User has no role (404), defaulting to basic_user");
            // User has no role, default to basic_user
            setUserType('basic_user');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("🔍 useUserRole: API response data:", result);
        
        if (result.success) {
          console.log("🔍 useUserRole: Setting userType to:", result.data.user_type);
          setUserType(result.data.user_type);
        } else {
          throw new Error(result.error || 'Failed to fetch user role');
        }
        
      } catch (error: any) {
        console.error("🔍 useUserRole: Error fetching user role:", error);
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