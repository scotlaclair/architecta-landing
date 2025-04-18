export default {
    async fetch(request, env, ctx) {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
  
      const formData = await request.formData();
      const email = formData.get("email");
  
      if (!email || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
        return new Response(JSON.stringify({ message: "Invalid email" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      await env.SUBSCRIBERS.put(`email:${email}`, new Date().toISOString());
  
      return new Response(JSON.stringify({ message: "You're on the list!" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  };