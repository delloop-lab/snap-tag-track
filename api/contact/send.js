import nodemailer from "nodemailer";

function fail(res, statusCode, error, errorCode) {
  return res.status(statusCode).json({ ok: false, error, errorCode: errorCode || "UNKNOWN" });
}

function sanitize(value, maxLen = 2000) {
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
    return fail(res, 405, "Method not allowed");
  }

  const firstName = sanitize(req.body?.firstName, 100);
  const lastName = sanitize(req.body?.lastName, 100);
  const email = sanitize(req.body?.email, 320);
  const subject = sanitize(req.body?.subject, 180);
  const message = sanitize(req.body?.message, 10000);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!firstName || !email || !subject || !message || !emailLooksValid) {
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

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL || !CONTACT_TO_EMAIL) {
    return fail(res, 500, "Email service is not configured", "CONFIG_MISSING");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const textBody = [
      `First name: ${firstName}`,
      `Last name: ${lastName || "Not provided"}`,
      `Email: ${email}`,
      "",
      "Message:",
      message,
    ].join("\n");

    await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text: textBody,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("CONTACT_SEND_FAIL:", error);
    const safeCode =
      error && typeof error === "object" && typeof error.code === "string"
        ? error.code
        : error && typeof error === "object" && typeof error.responseCode === "number"
          ? `SMTP_${error.responseCode}`
          : "SEND_FAILED";
    return fail(res, 502, "Could not send message right now", safeCode);
  }
}
