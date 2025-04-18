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

    await env.SUBSCRIBERS.put(`email:${email}`, new Date().toISOString());

    console.log("✅ Email stored successfully:", email);

    return new Response(JSON.stringify({ message: "You're on the list!" }), {
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