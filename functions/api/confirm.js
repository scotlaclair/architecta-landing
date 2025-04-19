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

  // Branded confirmation page
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Subscription Confirmed | Architecta</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: black;
      color: #ffffff;
      font-family: 'Segoe UI', sans-serif;
      height: 100vh;
      overflow: hidden;
    }
    #background {
      background-image: url('/assets/phase1_teaser.jpg');
      background-size: cover;
      background-position: center;
      opacity: 0;
      transition: opacity 2s ease-in;
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
    }
    #content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    h1 {
      font-size: 3.5rem;
      margin-bottom: 0.5rem;
      animation: fadeIn 2s ease-in-out forwards;
    }
    p {
      font-size: 1.25rem;
      color: #66fcf1;
      margin: 1.5rem 0 2.5rem 0;
      animation: fadeIn 2.5s ease-in-out forwards;
      animation-delay: 0.5s;
      opacity: 0;
    }
    a.cta {
      background: #66fcf1;
      color: #0b0c10;
      padding: 0.8rem 1.6rem;
      font-size: 1rem;
      font-weight: bold;
      border-radius: 5px;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: background 0.3s;
      margin-top: 1.5rem;
      display: inline-block;
    }
    a.cta:hover {
      background: #45a29e;
    }
    footer {
      position: absolute;
      bottom: 1rem;
      font-size: 0.8rem;
      color: #888;
      width: 100%;
      text-align: center;
    }
    @keyframes fadeIn {
      to { opacity: 1; }
    }
  </style>
</head>
<body onload="evolve()">
  <div id="background"></div>
  <div id="content">
    <h1>Thank you for confirming!</h1>
    <p>Your subscription is now active.<br>Welcome to the future of intelligent systems.</p>
    <a href="/" class="cta">Return to Architecta</a>
  </div>
  <footer>&copy; 2025 Architecta. All rights reserved.</footer>
  <script>
    function evolve() {
      document.getElementById('background').style.opacity = 1;
    }
    window.onload = evolve;
  </script>
</body>
</html>`, {
    headers: { "Content-Type": "text/html" }
  });
}
