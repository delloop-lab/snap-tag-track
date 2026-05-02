import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Set on `signUp` options.data when the user ticks Terms at registration (audit after email confirm). */
export const SIGNUP_TERMS_METADATA_KEY = "signup_terms_version" as const;

export async function ensureTermsSignupAcceptanceRecorded(
  client: SupabaseClient<Database>,
  user: User,
): Promise<void> {
  const version = user.user_metadata?.[SIGNUP_TERMS_METADATA_KEY];
  if (typeof version !== "string" || !version.trim()) return;

  const { data: existing, error: selectError } = await client
    .from("terms_registration_acceptances")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("terms_registration_acceptances select:", selectError);
    return;
  }
  if (existing) return;

  const { error: insertError } = await client.from("terms_registration_acceptances").insert({
    user_id: user.id,
    terms_version: version,
    signup_context: "registration",
  });
  if (insertError) console.error("terms_registration_acceptances insert:", insertError);
}
