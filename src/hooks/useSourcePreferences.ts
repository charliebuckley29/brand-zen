import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SOURCES, type SourceType } from "@/config/sources";

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

      const { data, error } = await (supabase as any)
        .from("source_preferences")
        .select("id, user_id, source_type, show_in_mentions, show_in_analytics, show_in_reports");
      if (!error && data) {
        const next = { ...prefs } as Record<SourceType, PrefRecord | null>;
        for (const s of ALL_SOURCES) next[s] = null; // reset
        for (const rec of (data as unknown as PrefRecord[])) {
          next[rec.source_type] = rec;
        }
        setPrefs(next);
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

    const payload: PrefRecord = {
      user_id: userId,
      source_type: source,
      show_in_mentions: prefs[source]?.show_in_mentions ?? true,
      show_in_analytics: prefs[source]?.show_in_analytics ?? true,
      show_in_reports: prefs[source]?.show_in_reports ?? true,
    } as PrefRecord;
    (payload as any)[field] = value;

    const { error } = await (supabase as any)
      .from("source_preferences")
      .upsert(payload as any, { onConflict: "user_id,source_type" });
    if (error) {
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

    const payload: PrefRecord = {
      user_id: userId,
      source_type: source,
      show_in_mentions: value,
      show_in_analytics: value,
      show_in_reports: value,
    };

    const { error } = await (supabase as any)
      .from("source_preferences")
      .upsert(payload as any, { onConflict: "user_id,source_type" });
    if (error) {
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
