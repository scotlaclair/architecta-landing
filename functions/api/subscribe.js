export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  try {
    const formData = await request.formData();
    const email = formData.get("email");

    console.log("📨 Received email submission:", email);

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      console.warn("⚠️ Invalid email format:", email);
      return new Response(JSON.stringify({ message: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate a unique confirmation token
    const token = crypto.randomUUID();
    const subscriberKey = `subscriber:${email}`;
    const tokenKey = `token:${token}`;
    const now = new Date().toISOString();

    // Store subscriber with unconfirmed status and token
    await env.SUBSCRIBERS.put(subscriberKey, JSON.stringify({
      email,
      confirmed: false,
      token,
      created: now
    }));
    // Store token lookup for confirmation
    await env.SUBSCRIBERS.put(tokenKey, email, { expirationTtl: 60 * 60 * 24 }); // 24h expiry

    // Pseudo-send confirmation email (replace with real email service)
    const confirmUrl = `${request.headers.get("origin") || "https://architecta.ai"}/api/confirm?token=${token}`;

    // Send confirmation email using Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Architecta <no-reply@architecta.ai>", // Use your verified sender domain
        to: email,
        subject: "Confirm your Architecta subscription",
        html: `<p>Thank you for subscribing to Architecta updates!</p><p>Please <a href='${confirmUrl}'>click here to confirm your email</a> and activate your subscription.</p><p>If you did not request this, you can ignore this email.</p>`
      })
    });
    if (!resendRes.ok) {
      console.error("Failed to send confirmation email via Resend", await resendRes.text());
      return new Response(JSON.stringify({ message: "Failed to send confirmation email. Please try again later." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "Check your email to confirm your subscription." }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("🔥 Error in subscription handler:", error);
    return new Response(JSON.stringify({
      message: "Internal error in subscription function.",
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}