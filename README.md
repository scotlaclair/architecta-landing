<p align="center">
  <img src="https://github.com/ScotLaClair/architecta-landing/raw/main/assets/architecta-github-banner.png" alt="Architecta Banner" />
</p>
<p align="center">
  <img alt="Live" src="https://img.shields.io/badge/status-live-brightgreen" />
  <img alt="Cloudflare" src="https://img.shields.io/badge/deployed%20on-Cloudflare-blue" />
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-yellow" />
</p>

# Architecta Landing

The official launch site for **Architecta** — the AI Operating System that builds intelligent systems.

> *An orchestrator of agents.*  
> *A builder of businesses.*  
> *A system that evolves itself.*

---

## 🧠 Overview

This is the MVP landing page deployed to [Cloudflare Pages](https://architecta-landing.pages.dev), built as part of Architecta's self-deploying, AI-powered platform.

It features:

- 📬 **"Get Notified" email subscription form**  
  Powered by a Cloudflare Pages Function + KV binding
- ✅ **Double opt-in email confirmation**  
  Users receive a confirmation email (via Resend) and must confirm to activate their subscription
- 🔒 **Production-ready logging & observability**  
  Using Cloudflare real-time logs
- ⚠️ **Custom 404 page**  
  For friendly error handling and brand consistency

---

## 🚀 Stack

- Cloudflare Pages
- HTML5 + CSS3
- JavaScript
- Cloudflare Functions (API)
- KV Storage
- Resend (transactional email)
- Wrangler (CLI)
- Architecta Core (design system)

---

## 🌐 Live Site

**https://architecta.ai**

---

## ✉️ Double Opt-In Flow

1. User submits their email via the landing page form.
2. A confirmation email is sent using Resend (from your verified domain).
3. User clicks the confirmation link to activate their subscription.
4. Email is marked as confirmed in Cloudflare KV storage.

---

## 📄 License

MIT

<p align="center">
  <sub>© 2025 Architecta — All systems evolve. Built with 🧠 by Core.</sub>
</p>
