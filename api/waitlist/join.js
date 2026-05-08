import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

function fail(res, statusCode, error, errorCode) {
  return res.status(statusCode).json({ ok: false, error, errorCode: errorCode || "UNKNOWN" });
}

function sanitize(value, maxLen = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return fail(res, 405, "Method not allowed", "METHOD_NOT_ALLOWED");
  }

  const firstName = sanitize(req.body?.firstName, 120);
  const email = sanitize(req.body?.email, 320).toLowerCase();
  const source = sanitize(req.body?.source, 120) || "unknown";
  if (!firstName || !email) {
    return fail(res, 400, "Missing required fields", "BAD_REQUEST");
  }

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
  const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
  const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "SnapTagTrack";
  const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "snappy@snaptagtrack.com";
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    return fail(res, 500, "Email service is not configured", "CONFIG_MISSING");
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return fail(res, 500, "Waitlist storage is not configured", "DB_CONFIG_MISSING");
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Track waitlist join requests and update existing rows by email.
    const { data: existing, error: selectError } = await admin
      .from("waitlist_entries")
      .select("request_count")
      .eq("email", email)
      .maybeSingle();
    if (selectError) throw selectError;

    const requestCount = (existing?.request_count || 0) + 1;
    const { error: upsertError } = await admin.from("waitlist_entries").upsert(
      {
        first_name: firstName,
        email,
        source,
        request_count: requestCount,
        last_requested_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
    if (upsertError) throw upsertError;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: "[Waitlist] New signup waitlist request",
      text: `First name: ${firstName}\nEmail: ${email}\nSource: ${source}\nRequest count: ${requestCount}`,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("WAITLIST_JOIN_FAIL:", error);
    const safeCode =
      error && typeof error === "object" && typeof error.code === "string"
        ? error.code
        : "SEND_FAILED";
    return fail(res, 502, "Could not add to waitlist right now", safeCode);
  }
}
