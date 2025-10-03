import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  team_emails: string[];
  // Brand information fields
  brand_website: string | null;
  brand_description: string | null;
  social_media_links: Record<string, string> | null;
  notification_preferences?: {
    email?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly';
    };
  };
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
        .select("full_name, phone_number, team_emails, brand_website, brand_description, social_media_links, notification_preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking profile:", error);
        setIsProfileComplete(false);
        setLoading(false);
        return;
      }

      setProfileData(profile ? {
        ...profile,
        team_emails: profile.team_emails || [],
        brand_website: profile.brand_website || null,
        brand_description: profile.brand_description || null,
        social_media_links: profile.social_media_links || null,
        notification_preferences: profile.notification_preferences ? profile.notification_preferences as { 
          email?: { enabled: boolean; frequency: 'immediate' | 'daily' | 'weekly' };
        } : undefined
      } : null);

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

  const updateProfile = async (fullName: string, phoneNumber?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        throw new Error("Not authenticated. Please log in again.");
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim(),
          phone_number: phoneNumber?.trim() || null
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      setProfileData(prev => ({
        ...prev,
        full_name: fullName.trim(),
        phone_number: phoneNumber?.trim() || null
      }));
      setIsProfileComplete(true);
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating profile:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  };

  const updateTeamEmails = async (teamEmails: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        throw new Error("Not authenticated. Please log in again.");
      }

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      const validEmails = teamEmails.filter(email => emailRegex.test(email));
      
      if (validEmails.length !== teamEmails.length) {
        throw new Error("One or more email addresses are invalid");
      }

      if (validEmails.length > 10) {
        throw new Error("Maximum 10 team emails allowed");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          team_emails: validEmails
        })
        .eq('user_id', user.id);

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      setProfileData(prev => prev ? ({
        ...prev,
        team_emails: validEmails
      }) : null);
      
      return { success: true };
    } catch (error: any) {
      console.error("Error updating team emails:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  };

  const updateBrandInformation = async (brandInfo: {
    brand_website?: string;
    brand_description?: string;
    social_media_links?: Record<string, string>;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: any = {};
      if (brandInfo.brand_website !== undefined) {
        updateData.brand_website = brandInfo.brand_website.trim() || null;
      }
      if (brandInfo.brand_description !== undefined) {
        updateData.brand_description = brandInfo.brand_description.trim() || null;
      }
      if (brandInfo.social_media_links !== undefined) {
        updateData.social_media_links = Object.keys(brandInfo.social_media_links).length > 0 
          ? brandInfo.social_media_links 
          : null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfileData(prev => prev ? ({
        ...prev,
        ...updateData
      }) : null);
      
      return { success: true };
    } catch (error) {
      console.error("Error updating brand information:", error);
      return { success: false, error };
    }
  };

  const updateNotificationPreferences = async (preferences: { 
    email?: { enabled: boolean; frequency: 'immediate' | 'daily' | 'weekly' };
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: preferences
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfileData(prev => prev ? ({
        ...prev,
        notification_preferences: preferences
      }) : null);
      
      return { success: true };
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      return { success: false, error };
    }
  };

  return {
    profileData,
    isProfileComplete,
    loading,
    updateProfile,
    updateTeamEmails,
    updateBrandInformation,
    updateNotificationPreferences,
    refreshProfile: checkProfileCompletion
  };
}