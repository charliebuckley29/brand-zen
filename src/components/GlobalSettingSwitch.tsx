import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GlobalSettingSwitchProps {
  settingKey: string;
  onUpdate?: () => void;
}

export function GlobalSettingSwitch({ settingKey, onUpdate }: GlobalSettingSwitchProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSetting();
  }, [settingKey]);

  const fetchSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("global_settings")
        .select("setting_value")
        .eq("setting_key", settingKey)
        .single();

      if (error) throw error;

      setEnabled(data.setting_value === true);
    } catch (error) {
      console.error("Error fetching global setting:", error);
      toast({
        title: "Error",
        description: "Failed to fetch setting",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (newValue: boolean) => {
    try {
      const { error } = await supabase
        .from("global_settings")
        .update({ 
          setting_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq("setting_key", settingKey);

      if (error) throw error;

      setEnabled(newValue);
      onUpdate?.();
      
      toast({
        title: "Setting updated",
        description: `${settingKey} has been ${newValue ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error("Error updating global setting:", error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="w-10 h-6 bg-muted animate-pulse rounded-full" />;
  }

  return (
    <Switch
      checked={enabled}
      onCheckedChange={updateSetting}
    />
  );
}