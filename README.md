# Gift Circle

Create a group, invite people with a code, and let the admin draw names.
Each member sees only who they are gifting, never who is gifting them.

- `backend/` — Django + Django REST Framework (token auth, SQLite in dev)
- `frontend/` — Next.js (App Router) + Tailwind. Its server holds the API token in an
  httpOnly cookie and proxies requests to Django, so the browser never talks to Django directly.

## Rules

- At least 4 members are needed to draw.
- Only the admin can draw. The admin is included in the draw.
- The draw is one shuffled cycle (A→B→C→D→A): nobody gets themselves and there are no closed pairs.
- Joining closes once names are drawn.
- The admin can redraw 10 hours after the last draw. Everyone gets a new person.
- The API only ever returns *your* receiver. Assignments aren't in the Django admin either.

## Running locally

Backend (port 8000). The venv lives in `%USERPROFILE%\.venvs\random-gift` because Windows
blocks creating it inside Documents on this machine.

```powershell
cd backend
.\dev.ps1 setup
.\dev.ps1 test
.\dev.ps1 run
```

Frontend (port 3000), in a second terminal:

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying

```
Browser ──► Vercel (Next.js) ──► Render (Django API) ──► Aiven (PostgreSQL)
```

Only the Next.js server talks to Django, so Django needs no CORS setup.
Deploy in this order, because each step needs a URL from the one before.

### 1. Aiven: the database

1. Create a **PostgreSQL** service at https://console.aiven.io (the free plan is fine).
2. Wait until it's *Running*, then copy the **Service URI** from the *Overview* tab.
   It looks like `postgres://avnadmin:…@pg-xxxx.aivencloud.com:12345/defaultdb?sslmode=require`.

Keep the `?sslmode=require` part, because Aiven only accepts encrypted connections.

### 2. Render: the Django API

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and pick the repo. It reads [`render.yaml`](render.yaml).
3. When it asks for `DATABASE_URL`, paste the Aiven Service URI.
   `DJANGO_SECRET_KEY` is generated for you.
4. When the deploy finishes, open `https://<your-service>.onrender.com/api/health/`.
   It should show `{"status": "ok"}`, which means Django can reach Aiven.

Migrations run every time the service starts. To use the Django admin, open the service's **Shell** tab and run
`python manage.py createsuperuser`.

### 3. Vercel: the Next.js frontend

1. In Vercel, choose **Add New → Project** and import the repo.
2. Set **Root Directory** to `frontend`. Vercel detects Next.js on its own.
3. Add the environment variable `DJANGO_API_URL` = `https://<your-service>.onrender.com`
   (no trailing slash).
4. Deploy.

### Free-plan notes

- Render's free web services **go to sleep after 15 minutes without traffic**. The first request after that
  takes about 50 seconds while it wakes up. The frontend waits up to 60 seconds and shows a
  "waking up" message if that isn't enough. A paid Render instance never sleeps.
- Aiven's free PostgreSQL plan is a single small node. That's fine for this app, but it has no backups or high availability.
