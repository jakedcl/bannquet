# UserMap Socket.io Server

Real-time WebSocket server for the Bannquet community map feature.

## Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3002`

## Production Deployment

### Option 1: Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and initialize:**
   ```bash
   railway login
   railway init
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

4. **Set environment variables in Railway dashboard:**
   - `ALLOWED_ORIGINS`: Your Vercel domain (e.g., `https://bannquet.com,https://www.bannquet.com`)
   - `PORT`: Railway will auto-assign (usually 3000)

5. **Get your Railway URL** and set it in Vercel:
   - Go to Railway project → Settings → Generate Domain
   - Copy the URL (e.g., `https://usermap-production.up.railway.app`)
   - In Vercel: Add environment variable `NEXT_PUBLIC_USERMAP_SERVER_URL` = your Railway URL

### Option 2: Render

1. **Create a new Web Service** on Render
2. **Connect your GitHub repo**
3. **Settings:**
   - **Root Directory**: `usermap-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. **Environment Variables:**
   - `ALLOWED_ORIGINS`: Your Vercel domain
   - `PORT`: Render auto-assigns (usually 10000)

5. **Get your Render URL** and set in Vercel:
   - Copy the Render service URL
   - In Vercel: Add `NEXT_PUBLIC_USERMAP_SERVER_URL` = your Render URL

### Option 3: Fly.io

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create fly.toml** (already created below)
3. **Deploy:**
   ```bash
   fly launch
   fly deploy
   ```

4. **Set secrets:**
   ```bash
   fly secrets set ALLOWED_ORIGINS=https://your-vercel-domain.com
   ```

5. **Get your Fly.io URL** and set in Vercel

## Environment Variables

- `PORT` - Server port (auto-assigned by hosting platform)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins (e.g., `https://bannquet.com,https://www.bannquet.com`)

## Health Check

The server exposes a `/health` endpoint:
```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "onlineCount": 5,
  "timestamp": "2025-01-11T..."
}
```

## Data Persistence

Data is stored in JSON files:
- `data/usermap-visitors.json` - Visitor location data
- `data/usermap-messages.json` - Chat message history

**Note**: On most hosting platforms, the filesystem is ephemeral. For production, consider:
- Using a database (PostgreSQL, MongoDB)
- Using persistent volumes (Railway/Render offer this)
- Using object storage (S3, etc.)

