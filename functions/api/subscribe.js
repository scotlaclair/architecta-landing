function toBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeMimeHeader(value) {
  const utf8 = new TextEncoder().encode(value);
  let binary = "";
  for (const b of utf8) binary += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function buildRawMimeEmail({ from, replyTo, to, subject, text, html }) {
  const boundary = `=_arch_${crypto.randomUUID().replace(/-/g, "")}`;
  const cleanFrom = String(from).replace(/[\r\n]+/g, " ").trim();
  const cleanReplyTo = String(replyTo || cleanFrom).replace(/[\r\n]+/g, " ").trim();
  const cleanTo = String(to).replace(/[\r\n]+/g, "").trim();
  const cleanSubject = String(subject).replace(/[\r\n]+/g, " ").trim();

  const lines = [
    `From: ${cleanFrom}`,
    `Reply-To: ${cleanReplyTo}`,
    `To: ${cleanTo}`,
    `Subject: ${encodeMimeHeader(cleanSubject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toBase64Standard(text),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toBase64Standard(html),
    "",
    `--${boundary}--`,
  ];

  const rawBytes = new TextEncoder().encode(lines.join("\r\n"));
  return toBase64Url(rawBytes);
}

function toBase64Standard(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getGoogleAccessToken(env) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google OAuth refresh failed (${tokenRes.status}): ${err}`);
  }
  const data = await tokenRes.json();
  if (!data.access_token) {
    throw new Error("Google OAuth response missing access_token");
  }
  return data.access_token;
}

async function verifyTurnstile(token, secret, remoteIp) {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return { success: false, error: `Turnstile verify HTTP ${res.status}` };
  return res.json();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    // Server-side honeypot check
    if (formData.get("confirm_email")) {
      return new Response(JSON.stringify({ message: "Check your email to confirm your subscription." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return new Response(JSON.stringify({ message: "Enter an email address in the format you@example.com." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify Cloudflare Turnstile challenge when configured
    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileToken = String(formData.get("cf-turnstile-response") || "").trim();
      if (!turnstileToken) {
        return new Response(JSON.stringify({ message: "Please complete the verification check and try again." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const verify = await verifyTurnstile(
        turnstileToken,
        env.TURNSTILE_SECRET_KEY,
        request.headers.get("CF-Connecting-IP")
      );
      if (!verify.success) {
        console.warn("Turnstile rejected submission:", verify["error-codes"]);
        return new Response(JSON.stringify({ message: "Verification check failed. Please refresh and try again." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
      console.error("Missing Google Workspace Gmail API OAuth secrets");
      return new Response(JSON.stringify({ message: "Email delivery is not configured yet. Please try again shortly." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Preserve already-confirmed subscribers instead of downgrading them
    const subscriberKey = `subscriber:${email}`;
    const existingRaw = await env.SUBSCRIBERS.get(subscriberKey);
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw);
        if (existing.confirmed) {
          return new Response(JSON.stringify({ message: "You're already confirmed on the Architecta waitlist." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (_) {}
    }

    // Generate confirmation token
    const token = crypto.randomUUID();
    const tokenKey = `token:${token}`;
    const now = new Date().toISOString();

    await env.SUBSCRIBERS.put(
      subscriberKey,
      JSON.stringify({
        email,
        confirmed: false,
        token,
        created: now,
      })
    );
    await env.SUBSCRIBERS.put(tokenKey, email, { expirationTtl: 60 * 60 * 24 });

    const reqOrigin = new URL(request.url).origin || "https://architecta.ai";
    const confirmUrl = `${reqOrigin}/api/confirm?token=${encodeURIComponent(token)}`;
    const senderFrom = env.WORKSPACE_SENDER || "Architecta <no-reply@architecta.ai>";
    const replyTo = env.WORKSPACE_REPLY_TO || "Architecta <architect@somedad.com>";

    const rawMime = buildRawMimeEmail({
      from: senderFrom,
      replyTo,
      to: email,
      subject: "Confirm your Architecta waitlist signup",
      text: [
        "Thank you for subscribing to Architecta updates!",
        "",
        `Confirm your email address by opening this link (valid for 24 hours):`,
        confirmUrl,
        "",
        "If you did not request this update, you can safely ignore this message.",
        "",
        "— Architecta (architecta.ai) · SomeDad Entertainment LLC",
      ].join("\n"),
      html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#0b0c10;color:#ffffff;padding:28px;border-radius:8px;max-width:560px;">
  <h2 style="margin:0 0 12px;color:#66fcf1;">Architecta</h2>
  <p style="margin:0 0 16px;line-height:1.6;">Thank you for subscribing to Architecta updates.</p>
  <p style="margin:0 0 24px;">
    <a href="${confirmUrl}" style="display:inline-block;background:#66fcf1;color:#0b0c10;font-weight:700;padding:12px 20px;border-radius:6px;text-decoration:none;">Confirm Email Address</a>
  </p>
  <p style="margin:0 0 12px;font-size:13px;color:#9fb1c1;">If the button doesn't work, paste this link into your browser:<br>${confirmUrl}</p>
  <p style="margin:0;font-size:12px;color:#829ab1;">If you did not request this, you can safely ignore this email. Valid for 24 hours.</p>
</div>`,
    });

    const accessToken = await getGoogleAccessToken(env);
    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawMime }),
    });

    if (!gmailRes.ok) {
      const errorText = await gmailRes.text();
      console.error("Gmail API send failed:", gmailRes.status, errorText);
      return new Response(
        JSON.stringify({ message: "Failed to send confirmation email. Please try again later." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ message: "Check your email to confirm your subscription." }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in subscription handler:", error);
    return new Response(JSON.stringify({ message: "Internal error in subscription function." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
