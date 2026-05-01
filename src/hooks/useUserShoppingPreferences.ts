import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  FALLBACK_RETURN_WINDOW_DAYS,
  FALLBACK_WARRANTY_MONTHS,
  SNAP_USER_SHOPPING_PREFS_EVENT,
} from "@/lib/userShoppingPreferences";

export type UserShoppingPreferences = {
  warrantyDefaultMonths: number;
  returnWindowDays: number;
  /** False until first fetch for the current user finishes. */
  ready: boolean;
};

export function useUserShoppingPreferences(): UserShoppingPreferences {
  const { user } = useAuth();
  const [warrantyDefaultMonths, setWarrantyDefaultMonths] = useState(FALLBACK_WARRANTY_MONTHS);
  const [returnWindowDays, setReturnWindowDays] = useState(FALLBACK_RETURN_WINDOW_DAYS);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setWarrantyDefaultMonths(FALLBACK_WARRANTY_MONTHS);
      setReturnWindowDays(FALLBACK_RETURN_WINDOW_DAYS);
      setReady(true);
      return;
    }
    setReady(false);
    const res = await supabase
      .from("users")
      .select("warranty_default_months, return_window_days")
      .eq("id", user.id)
      .maybeSingle();

    if (!res.error && res.data) {
      const wm = res.data.warranty_default_months;
      const rd = res.data.return_window_days;
      if (typeof wm === "number" && wm >= 1) setWarrantyDefaultMonths(wm);
      else setWarrantyDefaultMonths(FALLBACK_WARRANTY_MONTHS);
      if (typeof rd === "number" && rd >= 0) setReturnWindowDays(rd);
      else setReturnWindowDays(FALLBACK_RETURN_WINDOW_DAYS);
    }
    setReady(true);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(SNAP_USER_SHOPPING_PREFS_EVENT, onChange);
    return () => window.removeEventListener(SNAP_USER_SHOPPING_PREFS_EVENT, onChange);
  }, [load]);

  return { warrantyDefaultMonths, returnWindowDays, ready };
}
