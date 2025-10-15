import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SOURCES, type SourceType } from "@/config/sources";
import { apiFetch } from "@/lib/api";

type PrefRecord = {
  id?: string;
  user_id: string;
  source_type: SourceType;
  show_in_mentions: boolean;
  show_in_analytics: boolean;
  show_in_reports: boolean;
};

const ALL_SOURCES: SourceType[] = Object.keys(SOURCES) as SourceType[];

export function useSourcePreferences() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<SourceType, PrefRecord | null>>(() => {
    const initialPrefs = {} as Record<SourceType, PrefRecord | null>;
    ALL_SOURCES.forEach(source => {
      initialPrefs[source] = null;
    });
    return initialPrefs;
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(user.id);

      try {
        // Fetch keyword-source preferences from new API
        const response = await apiFetch(`/keyword-source-preferences?userId=${user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Convert keyword-source preferences to source-level preferences
            // Group by source_type and take the first preference for each source
            const sourcePrefs = new Map<SourceType, PrefRecord>();
            
            for (const pref of result.data) {
              const sourceType = pref.source_type as SourceType;
              if (!sourcePrefs.has(sourceType)) {
                sourcePrefs.set(sourceType, {
                  id: pref.id,
                  user_id: pref.user_id,
                  source_type: sourceType,
                  show_in_mentions: pref.show_in_mentions,
                  show_in_analytics: pref.show_in_analytics,
                  show_in_reports: pref.show_in_reports
                });
              }
            }
            
            const next = { ...prefs } as Record<SourceType, PrefRecord | null>;
            for (const s of ALL_SOURCES) next[s] = null; // reset
            for (const [sourceType, pref] of sourcePrefs) {
              next[sourceType] = pref;
            }
            setPrefs(next);
          }
        }
      } catch (error) {
        console.error('Failed to fetch source preferences:', error);
      }
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledFor = useCallback((field: keyof Pick<PrefRecord, "show_in_mentions" | "show_in_analytics" | "show_in_reports">) => {
    // default is true if preference is missing
    return ALL_SOURCES.filter((s) => prefs[s]?.[field] !== false);
  }, [prefs]);

  const enabledMentions = useMemo(() => enabledFor("show_in_mentions"), [enabledFor]);
  const enabledAnalytics = useMemo(() => enabledFor("show_in_analytics"), [enabledFor]);
  const enabledReports = useMemo(() => enabledFor("show_in_reports"), [enabledFor]);

  const setPref = useCallback(async (
    source: SourceType,
    field: keyof Pick<PrefRecord, "show_in_mentions" | "show_in_analytics" | "show_in_reports">,
    value: boolean
  ) => {
    if (!userId) return;
    
    // optimistic update
    setPrefs((prev) => {
      const current = prev[source] || { user_id: userId, source_type: source, show_in_mentions: true, show_in_analytics: true, show_in_reports: true };
      const updated = { ...current, [field]: value } as PrefRecord;
      return { ...prev, [source]: updated } as typeof prev;
    });

    try {
      // Get all keywords for this user
      const keywordsResponse = await apiFetch(`/admin/keywords-management?user_id=${userId}`);
      if (!keywordsResponse.ok) throw new Error('Failed to fetch keywords');
      
      const keywordsResult = await keywordsResponse.json();
      if (!keywordsResult.success || !keywordsResult.data) {
        throw new Error('No keywords found');
      }

      // Update all keyword-source combinations for this source type
      const updatePromises = keywordsResult.data.map(async (keywordData: any) => {
        const preferences = {
          show_in_mentions: prefs[source]?.show_in_mentions ?? true,
          show_in_analytics: prefs[source]?.show_in_analytics ?? true,
          show_in_reports: prefs[source]?.show_in_reports ?? true,
        };
        preferences[field] = value;

        const response = await apiFetch('/keyword-source-preferences', {
          method: 'PUT',
          body: JSON.stringify({
            userId,
            keyword: keywordData.brand_name,
            sourceType: source,
            preferences
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update preference for keyword: ${keywordData.brand_name}`);
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      // revert on error
      setPrefs((prev) => ({ ...prev }));
      throw error;
    }
  }, [userId, prefs]);

  const setAllForSource = useCallback(async (source: SourceType, value: boolean) => {
    if (!userId) return;
    
    // optimistic update
    setPrefs((prev) => {
      const current = prev[source] || { user_id: userId, source_type: source, show_in_mentions: true, show_in_analytics: true, show_in_reports: true };
      const updated: PrefRecord = { ...current, show_in_mentions: value, show_in_analytics: value, show_in_reports: value };
      return { ...prev, [source]: updated } as typeof prev;
    });

    try {
      // Get all keywords for this user
      const keywordsResponse = await apiFetch(`/admin/keywords-management?user_id=${userId}`);
      if (!keywordsResponse.ok) throw new Error('Failed to fetch keywords');
      
      const keywordsResult = await keywordsResponse.json();
      if (!keywordsResult.success || !keywordsResult.data) {
        throw new Error('No keywords found');
      }

      // Update all keyword-source combinations for this source type
      const updatePromises = keywordsResult.data.map(async (keywordData: any) => {
        const preferences = {
          show_in_mentions: value,
          show_in_analytics: value,
          show_in_reports: value,
        };

        const response = await apiFetch('/keyword-source-preferences', {
          method: 'PUT',
          body: JSON.stringify({
            userId,
            keyword: keywordData.brand_name,
            sourceType: source,
            preferences
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update preference for keyword: ${keywordData.brand_name}`);
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      // revert on error
      setPrefs((prev) => ({ ...prev }));
      throw error;
    }
  }, [userId]);

  return {
    loading,
    prefs,
    enabledMentions,
    enabledAnalytics,
    enabledReports,
    setPref,
    setAllForSource,
  } as const;
}
