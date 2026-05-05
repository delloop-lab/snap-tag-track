import jwt from "jsonwebtoken";

const CLOCK_SKEW_SECONDS = 30;
const isProduction = process.env.NODE_ENV === "production";

function fail(res, statusCode, reason) {
  return res.status(statusCode).json({
    valid: false,
    error: reason,
  });
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return fail(res, 405, "Method not allowed");
  }

  const secret = process.env.TASKORILLA_SSO_SECRET;
  const token = req.body?.token;

  // Debug logs are intentionally disabled in production.
  if (!isProduction) {
    console.log("SSO_SECRET_EXISTS:", !!secret);
    console.log("TOKEN_RECEIVED:", token);
  }

  if (!secret) {
    console.error("verify-taskorilla-token: Missing secret configuration");
    return fail(res, 500, "Missing secret configuration");
  }

  if (!token || typeof token !== "string") {
    console.error("verify-taskorilla-token: Malformed token");
    return fail(res, 400, "Malformed token");
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: CLOCK_SKEW_SECONDS,
    });

    if (!decoded || typeof decoded !== "object") {
      console.error("verify-taskorilla-token: Malformed token payload");
      return fail(res, 400, "Malformed token");
    }

    const { name, email, source, exp } = decoded;
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (!name || !email || source !== "taskorilla") {
      console.error("verify-taskorilla-token: Malformed token claims");
      return fail(res, 400, "Malformed token");
    }

    if (typeof exp !== "number") {
      console.error("verify-taskorilla-token: Missing exp claim");
      return fail(res, 400, "Malformed token");
    }

    // Extra explicit check to keep expiration behavior transparent in logs.
    if (exp + CLOCK_SKEW_SECONDS < nowSeconds) {
      console.error("verify-taskorilla-token: Token expired");
      return fail(res, 401, "Token expired");
    }

    return res.status(200).json({
      valid: true,
      name,
      email,
    });
  } catch (error) {
    if (!isProduction) {
      console.error("TOKEN_VERIFY_ERROR:", error);
    }

    if (error instanceof jwt.TokenExpiredError) {
      return fail(res, 401, "Token expired");
    }

    if (error instanceof jwt.JsonWebTokenError) {
      if (error.message.toLowerCase().includes("signature")) {
        return fail(res, 401, "Invalid signature");
      }
      return fail(res, 400, "Malformed token");
    }

    return fail(res, 500, "Verification failed");
  }
}
