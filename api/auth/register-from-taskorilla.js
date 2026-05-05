import { createClient } from "@supabase/supabase-js";

const isProduction = process.env.NODE_ENV === "production";

function fail(res, statusCode, reason) {
  console.error("REGISTER_TASKORILLA_FAIL:", { statusCode, reason });
  res.setHeader("Allow", "POST, OPTIONS");
  return res.status(statusCode).json({
    valid: false,
    error: reason,
  });
}

export default async function handler(req, res) {
  console.log("REGISTER_TASKORILLA_HIT");
  console.log("REGISTER_TASKORILLA_PATH:", req.url);
  console.log("REGISTER_TASKORILLA_METHOD:", req.method);

  if (!isProduction) {
    console.log("REGISTER_TASKORILLA_CONTENT_TYPE:", req.headers["content-type"]);
    console.log("REGISTER_TASKORILLA_ORIGIN:", req.headers.origin);
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return fail(res, 405, "Method not allowed");
  }

  const { name, email, password, source } = req.body ?? {};
  if (!isProduction) {
    console.log("REGISTER_TASKORILLA_BODY_KEYS:", Object.keys(req.body ?? {}));
  }

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    source !== "taskorilla"
  ) {
    return fail(res, 400, "Malformed request");
  }

  if (!password.trim() || password.length < 8) {
    return fail(res, 400, "Invalid password");
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("REGISTER_TASKORILLA_CONFIG_MISSING:", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    });
    return fail(res, 500, "Missing Supabase configuration");
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const metadata = { name: name.trim(), source: "taskorilla" };

    // listUsers is used to avoid duplicate accounts when the invite email already exists.
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      console.error("REGISTER_TASKORILLA_LIST_USERS_ERROR:", listError);
      return fail(res, 500, "Could not verify existing account");
    }

    const existingUser = listData.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );

    if (existingUser) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata ?? {}),
          ...metadata,
        },
      });
      if (updateError) {
        console.error("REGISTER_TASKORILLA_UPDATE_ERROR:", updateError);
        return fail(res, 500, "Could not update account");
      }
    } else {
      const { error: createError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (createError) {
        console.error("REGISTER_TASKORILLA_CREATE_ERROR:", createError);
        return fail(res, 500, "Could not create account");
      }
    }

    return res.status(200).json({
      valid: true,
    });
  } catch (error) {
    if (!isProduction) {
      console.error("REGISTER_TASKORILLA_ERROR:", error);
    }
    return fail(res, 500, "Unexpected registration failure");
  }
}
