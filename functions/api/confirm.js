export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token.", { status: 400 });
  }

  // Lookup email by token
  const email = await env.SUBSCRIBERS.get(`token:${token}`);
  if (!email) {
    return new Response("Invalid or expired confirmation link.", { status: 400 });
  }

  const subscriberKey = `subscriber:${email}`;
  const subscriberRaw = await env.SUBSCRIBERS.get(subscriberKey);
  if (!subscriberRaw) {
    return new Response("Subscriber not found.", { status: 404 });
  }
  const subscriber = JSON.parse(subscriberRaw);

  if (subscriber.confirmed) {
    return new Response("Email already confirmed.", { status: 200 });
  }

  // Mark as confirmed
  subscriber.confirmed = true;
  await env.SUBSCRIBERS.put(subscriberKey, JSON.stringify(subscriber));
  // Optionally, delete the token
  await env.SUBSCRIBERS.delete(`token:${token}`);

  // Simple confirmation page
  return new Response(`<html><body><h1>Thank you for confirming your email!</h1><p>Your subscription is now active.</p></body></html>`, {
    headers: { "Content-Type": "text/html" }
  });
}
