import nodemailer from "nodemailer";

function fail(res, statusCode, error) {
  return res.status(statusCode).json({ ok: false, error });
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
  const subject = sanitize(req.body?.subject, 180);
  const message = sanitize(req.body?.message, 10000);
  const userEmail = sanitize(req.body?.userEmail, 320);

  if (!firstName || !lastName || !subject || !message) {
    return fail(res, 400, "Missing required fields");
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
    return fail(res, 500, "Email service is not configured");
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
      `Last name: ${lastName}`,
      `User email: ${userEmail || "Not provided (guest or unavailable)"}`,
      "",
      "Message:",
      message,
    ].join("\n");

    await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: userEmail || SMTP_FROM_EMAIL,
      subject: `[Contact] ${subject}`,
      text: textBody,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("CONTACT_SEND_FAIL:", error);
    return fail(res, 502, "Could not send message right now");
  }
}
