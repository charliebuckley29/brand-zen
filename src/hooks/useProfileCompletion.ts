import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  pr_team_email: string | null;
  legal_team_email: string | null;
}

export function useProfileCompletion() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfileCompletion();
  }, []);

  const checkProfileCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, phone_number, pr_team_email, legal_team_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking profile:", error);
        setIsProfileComplete(false);
        setLoading(false);
        return;
      }

      setProfileData(profile);

      // Check if profile is complete (full_name is required, phone_number is optional but encouraged)
      const isComplete = profile && 
        profile.full_name && 
        profile.full_name.trim().length > 0;

      setIsProfileComplete(isComplete);
    } catch (error) {
      console.error("Error checking profile completion:", error);
      setIsProfileComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (fullName: string, phoneNumber?: string, prTeamEmail?: string, legalTeamEmail?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim(),
          phone_number: phoneNumber?.trim() || null,
          pr_team_email: prTeamEmail?.trim() || null,
          legal_team_email: legalTeamEmail?.trim() || null
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setProfileData({
        full_name: fullName.trim(),
        phone_number: phoneNumber?.trim() || null,
        pr_team_email: prTeamEmail?.trim() || null,
        legal_team_email: legalTeamEmail?.trim() || null
      });
      setIsProfileComplete(true);
      
      return { success: true };
    } catch (error) {
      console.error("Error updating profile:", error);
      return { success: false, error };
    }
  };

  return {
    profileData,
    isProfileComplete,
    loading,
    updateProfile,
    refreshProfile: checkProfileCompletion
  };
}