import type { SupabaseClient } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

/** Keep in sync with inline script in index.html */
export const STORAGE_AUTH_FLOW_TYPE = "snap_auth_flow_type";
export const STORAGE_IMPLICIT_HASH = "snap_auth_implicit_hash";
export const STORAGE_PKCE_CODE = "snap_auth_code_present";

export type PendingAuthRedirectIndicators = {
  flowType: string | null;
  implicitGrantHash: boolean;
  pkceCodePresent: boolean;
};

/**
 * One-shot read after session exists. Clears stash; also reads OAuth params left in URL if stash missed them.
 */
export function takePendingAuthRedirectIndicators(): PendingAuthRedirectIndicators {
  try {
    const rawHash = window.location.hash.replace(/^#/, "");
    const rawSearch = window.location.search.slice(1);

    let flowType = sessionStorage.getItem(STORAGE_AUTH_FLOW_TYPE);
    if (flowType) sessionStorage.removeItem(STORAGE_AUTH_FLOW_TYPE);

    const hashParams = rawHash ? new URLSearchParams(rawHash) : null;
    const searchParams = rawSearch ? new URLSearchParams(rawSearch) : null;

    if (!flowType && hashParams?.get("type")) flowType = hashParams.get("type");
    if (!flowType && searchParams?.get("type")) flowType = searchParams.get("type");

    let implicitGrantHash =
      sessionStorage.getItem(STORAGE_IMPLICIT_HASH) === "1";
    sessionStorage.removeItem(STORAGE_IMPLICIT_HASH);

    implicitGrantHash =
      implicitGrantHash ||
      /access_token=/.test(rawHash) ||
      Boolean(hashParams?.has("refresh_token"));

    let pkceCodePresent = sessionStorage.getItem(STORAGE_PKCE_CODE) === "1";
    sessionStorage.removeItem(STORAGE_PKCE_CODE);
    pkceCodePresent =
      pkceCodePresent || Boolean(searchParams?.has("code"));

    return {
      flowType,
      implicitGrantHash,
      pkceCodePresent,
    };
  } catch {
    sessionStorage.removeItem(STORAGE_AUTH_FLOW_TYPE);
    sessionStorage.removeItem(STORAGE_IMPLICIT_HASH);
    sessionStorage.removeItem(STORAGE_PKCE_CODE);
    return {
      flowType: null,
      implicitGrantHash: false,
      pkceCodePresent: false,
    };
  }
}

export function profileNeedsRequiredFieldsPublic(
  row: {
    first_name: string | null;
    last_name: string | null;
    country: string | null;
  } | null,
): boolean {
  if (!row) return true;
  return (
    !row.first_name?.trim() || !row.last_name?.trim() || !row.country?.trim()
  );
}

/**
 * After silent OAuth/email redirects, chooses profile vs home (expects non-empty indicators).
 */
export async function computePostAuthLandingPath(
  client: SupabaseClient<Database>,
  userId: string,
  indicators: PendingAuthRedirectIndicators,
): Promise<{ path: string; replace: boolean }> {
  const ft = indicators.flowType;

  if (ft === "recovery") {
    return { path: "/", replace: true };
  }

  const { data: profileRow } = await client
    .from("users")
    .select("first_name, last_name, country")
    .eq("id", userId)
    .maybeSingle();

  const incomplete = profileNeedsRequiredFieldsPublic(profileRow ?? null);

  const fromSignupEmail =
    ft === "signup" || ft === "invite" || ft === "email_change";

  if (fromSignupEmail) {
    return { path: "/profile?postSignup=1", replace: true };
  }

  const silentAuthLanding =
    indicators.implicitGrantHash || indicators.pkceCodePresent;

  // Email confirm sometimes omits type in fragment; implicit grant hash + incomplete profile ⇒ new signup flow.
  if (silentAuthLanding && incomplete) {
    return { path: "/profile?postSignup=1", replace: true };
  }

  if (silentAuthLanding) {
    return { path: "/", replace: true };
  }

  return { path: "/", replace: true };
}

let postAuthLandingHandled = false;

export function resetPostAuthLandingGuard(): void {
  postAuthLandingHandled = false;
}
/**
 * Consume redirect hints exactly once after the user gains a Supabase session.
 * @returns true if this call handled redirect params and ran navigation (including /).
 */
export async function runPostAuthLandingOnce(
  client: SupabaseClient<Database>,
  navigate: NavigateFunction,
  userId: string,
): Promise<boolean> {
  if (postAuthLandingHandled) return false;

  const indicators = takePendingAuthRedirectIndicators();

  const hasIndicators =
    !!indicators.flowType ||
    indicators.implicitGrantHash ||
    indicators.pkceCodePresent;

  if (!hasIndicators) return false;

  postAuthLandingHandled = true;

  const chosen = await computePostAuthLandingPath(client, userId, indicators);

  navigate(chosen.path, { replace: chosen.replace });
  return true;
}
