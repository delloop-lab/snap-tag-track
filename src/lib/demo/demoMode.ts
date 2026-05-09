import type { User } from "@supabase/supabase-js";

/** Legacy session flag (landing “Try a Preview”). */
export const DEMO_MODE_STORAGE_KEY = "mode";
export const DEMO_MODE_VALUE = "demo";

/** Explicit preview after sign-out from “Preview dashboard” menu. */
export const PREVIEW_MODE_STORAGE_KEY = "preview_mode";
export const PREVIEW_MODE_VALUE = "true";

export function readDemoModeStorageFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DEMO_MODE_STORAGE_KEY) === DEMO_MODE_VALUE;
  } catch {
    return false;
  }
}

export function readPreviewModeFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PREVIEW_MODE_STORAGE_KEY) === PREVIEW_MODE_VALUE;
  } catch {
    return false;
  }
}

/** Set before sign-out so the next load of `/dashboard` uses demo data. */
export function setPreviewModeForDashboard(): void {
  try {
    sessionStorage.setItem(PREVIEW_MODE_STORAGE_KEY, PREVIEW_MODE_VALUE);
  } catch {
    /* ignore */
  }
}

export function clearPreviewModeFlag(): void {
  try {
    sessionStorage.removeItem(PREVIEW_MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Anonymous preview: explicit `preview_mode`, or legacy `mode=demo`.
 * Never active while a Supabase user is present.
 */
export function isClientDemoPreviewActive(user: User | null | undefined): boolean {
  if (user) return false;
  return readPreviewModeFlag() || readDemoModeStorageFlag();
}

export function enterClientDemoMode(): void {
  sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, DEMO_MODE_VALUE);
}

export function exitClientDemoMode(): void {
  sessionStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  clearPreviewModeFlag();
}

export function clearClientDemoModeForAuthenticatedUser(): void {
  exitClientDemoMode();
}

export function dashboardHomePath(isAuthenticated: boolean): string {
  if (!isAuthenticated && (readDemoModeStorageFlag() || readPreviewModeFlag())) {
    return "/dashboard";
  }
  return "/";
}
