# PixelMark Deployment Configuration Summary

## Environment Variables
The application uses the following key environment variables:

**Backend (`backend/.env`):**
- `DATABASE_URL`: The PostgreSQL connection string (supports NeonDB, format: `postgresql+asyncpg://...`). Falls back to `sqlite+aiosqlite:///./test.db` if not provided.
- `JWT_SECRET_KEY`: Secret used for signing JWT tokens. Falls back to `dev_secret_key_123` for local development.
- `FRONTEND_URL`: URL of the frontend for CORS settings. Defaults to `http://localhost:3000`.
- `ENVIRONMENT`: Sets the environment type (`development` or `production`). Defaults to `development`.

**Frontend (`web/.env.local`):**
- `NEXT_PUBLIC_API_URL`: The single source of truth for the backend API. Defaults to `http://localhost:8765`. 
- *(Other Supabase variables remain in place but routing defaults to the unified API).*

## Running Locally

**Backend:**
1. Navigate to `backend/`.
2. Activate your virtual environment (e.g., `venv\Scripts\activate`).
3. Run the development server: `uvicorn main:app --reload --port 8765`
*(It will default to local SQLite if `DATABASE_URL` is omitted, and allow CORS for `localhost:3000` / `3001` automatically).*

**Frontend:**
1. Navigate to `web/`.
2. Ensure dependencies are installed (`npm install`).
3. Start the dev server: `npm run dev`
*(It will automatically point to `http://localhost:8765` via `NEXT_PUBLIC_API_URL` unless overridden in `.env.local`).*

## Production Configuration

**Backend:**
- Hosted on your chosen platform (e.g., Railway/Render) using the command from `Procfile`: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Secrets:** Set `DATABASE_URL`, `JWT_SECRET_KEY`, `ENVIRONMENT=production`, and `FRONTEND_URL=https://your-frontend.vercel.app` as secure environment variables.
- The `DATABASE_URL` safely works with NeonDB by stripping out unsupported `sslmode` parameters and injecting standard SSL args.

**Frontend:**
- Hosted on Vercel (or similar).
- **Secrets:** Set `NEXT_PUBLIC_API_URL=https://your-backend-api.com` in your Vercel project settings.
- The WebSocket configuration (`ws://` vs `wss://`) is dynamically derived from `NEXT_PUBLIC_API_URL` at runtime.
