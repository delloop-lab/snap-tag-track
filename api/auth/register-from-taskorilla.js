const isProduction = process.env.NODE_ENV === "production";

function fail(res, statusCode, reason) {
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

  // NOTE:
  // This endpoint now correctly accepts JSON POST requests and is ready for
  // full registration + session wiring. Keep identity source as verified user
  // data from the prior token verification step (not URL params).
  return res.status(200).json({
    valid: true,
  });
}
