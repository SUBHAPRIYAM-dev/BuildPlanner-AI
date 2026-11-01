# Vercel Deployment & GitHub Hosting Guide

This guide explains how to push BuildPlanner AI to your GitHub repository and deploy it to Vercel.

---

## 1. Push to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. named `buildplanner-ai`).
   - *Do not* initialize it with a README, .gitignore, or license (the codebase already has them).

2. Link your local repository to GitHub and push:
   ```bash
   # Add your GitHub remote URL
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/buildplanner-ai.git

   # Push to main branch
   git push -u origin main
   ```

---

## 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and log in with your GitHub account.
2. Click **Import** next to your `buildplanner-ai` repository.
3. Vercel automatically detects the root configuration from [`vercel.json`](../vercel.json):
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `pnpm install`

### Environment Variables on Vercel (Optional)

In the Vercel project deployment screen, under **Environment Variables**, you can configure:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas connection string (free tier) | `mongodb+srv://user:pass@cluster.mongodb.net/buildplanner` |
| `JWT_SECRET` | Secret key for JWT auth tokens | `super_secure_random_string_32_chars` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `super_secure_refresh_random_string` |
| `VITE_API_URL` | Optional external API URL (leave empty if using Vercel serverless) | Empty or `https://my-backend.railway.app` |

4. Click **Deploy**. Your application will be live in ~1 minute with an automatic `*.vercel.app` domain!

---

## 3. How It Works

* **Frontend**: The React 19 + Three.js web app in `apps/web` is compiled and served globally via Vercel's Edge CDN.
* **Client-Side Routing**: SPA routes (`/wizard`, `/workspace/:id`, `/dashboard`) are automatically handled via the rewrites in `vercel.json`.
* **API Routing**: Requests to `/api/*` are handled by the serverless handler in [`api/index.ts`](../api/index.ts).
