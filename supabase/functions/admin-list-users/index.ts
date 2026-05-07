import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are not configured");
    }
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user: caller },
      error: callerErr,
    } = await authedClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRow, error: callerRoleErr } = await serviceClient
      .from("users")
      .select("user_type")
      .eq("id", caller.id)
      .maybeSingle();
    if (callerRoleErr || callerRow?.user_type !== "admin") {
      return new Response(JSON.stringify({ success: false, error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: appUsers, error: appUsersErr } = await serviceClient
      .from("users")
      .select("id, email, created_at, first_name, last_name, avatar_url")
      .order("created_at", { ascending: false });
    if (appUsersErr) throw appUsersErr;

    const lastSignInById = new Map<string, string | null>();
    const { data: authUsersPage, error: authUsersErr } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (!authUsersErr && Array.isArray(authUsersPage?.users)) {
      for (const authUser of authUsersPage.users) {
        lastSignInById.set(authUser.id, authUser.last_sign_in_at ?? null);
      }
    }

    const users = (appUsers ?? []).map((u) => ({
      ...u,
      last_sign_in_at: lastSignInById.get(u.id) ?? null,
    }));

    return new Response(JSON.stringify({ success: true, users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-list-users error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
