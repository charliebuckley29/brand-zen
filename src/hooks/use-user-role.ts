import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserType = 'admin' | 'moderator' | 'legal_user' | 'pr_user' | 'basic_user';

export function useUserRole() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from("user_roles")
            .select("user_type")
            .eq("user_id", user.id)
            .single();

          if (error) {
            console.error("Error fetching user role:", error);
            setUserType('basic_user'); // Default to basic user if no role found
          } else {
            setUserType(data.user_type);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserType('basic_user');
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
    hasAccess,
    isModerator,
    isLegalUser,
    isPRUser,
    isAdmin
  };
}