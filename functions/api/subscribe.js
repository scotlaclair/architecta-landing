export async function onRequestPost(context) {
  try {
    const request = context.request;
    const env = context.env;

    const formData = await request.formData();
    const email = formData.get("email");

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ message: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await env.SUBSCRIBERS.put(`email:${email}`, new Date().toISOString());

    return new Response(JSON.stringify({ message: "You're on the list!" }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({
      message: "Internal error in subscription function.",
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}