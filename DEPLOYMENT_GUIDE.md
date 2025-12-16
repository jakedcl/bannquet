# 🚀 Deploying the UserMap Socket.io Server

The community map feature requires a separate Socket.io server running 24/7. Here's how to deploy it.

## 🎯 **Recommended: Railway (Easiest)**

Railway is perfect for Socket.io servers - persistent connections, easy setup, free tier.

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub
1. **Option A: Deploy from GitHub repo**
   - Click "Deploy from GitHub repo"
   - Select your `bannquet` repository
   - Railway will detect it's a Node.js project

2. **Option B: Deploy from local directory**
   ```bash
   npm i -g @railway/cli
   railway login
   cd usermap-server
   railway init
   railway up
   ```

### Step 3: Configure Railway
1. In Railway dashboard, click on your service
2. Go to **Settings** → **Variables**
3. Add environment variable:
   ```
   ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://your-custom-domain.com
   ```
   (Replace with your actual Vercel domain)

4. Railway will auto-assign a `PORT` variable (usually 3000)

### Step 4: Get Your Server URL
1. In Railway dashboard → **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the URL (e.g., `https://usermap-production.up.railway.app`)

### Step 5: Update Vercel Environment Variables
1. Go to your Vercel project dashboard
2. **Settings** → **Environment Variables**
3. Add:
   ```
   NEXT_PUBLIC_USERMAP_SERVER_URL=https://your-railway-url.up.railway.app
   ```
4. **Redeploy** your Vercel app

### Step 6: Test
1. Visit your deployed site
2. Go to `/usermap`
3. Open browser console - should see "🔌 Connected to UserMap server"
4. Try dropping a pin and sending a message!

---

## 🔄 **Alternative: Render**

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `bannquet-usermap`
   - **Root Directory**: `usermap-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 3: Environment Variables
Add in Render dashboard:
```
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

### Step 4: Get URL & Update Vercel
1. Render will give you a URL like `https://bannquet-usermap.onrender.com`
2. Add to Vercel: `NEXT_PUBLIC_USERMAP_SERVER_URL=https://bannquet-usermap.onrender.com`
3. Redeploy Vercel

---

## 🪂 **Alternative: Fly.io**

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Deploy
```bash
cd usermap-server
fly launch
# Follow prompts, say yes to deploying
fly deploy
```

### Step 3: Set Secrets
```bash
fly secrets set ALLOWED_ORIGINS=https://your-vercel-domain.com
```

### Step 4: Get URL & Update Vercel
```bash
fly status
# Copy the URL, add to Vercel env vars
```

---

## 📋 **Quick Checklist**

- [ ] Deploy Socket.io server (Railway/Render/Fly.io)
- [ ] Set `ALLOWED_ORIGINS` environment variable
- [ ] Get server URL
- [ ] Add `NEXT_PUBLIC_USERMAP_SERVER_URL` to Vercel
- [ ] Redeploy Vercel app
- [ ] Test `/usermap` page

---

## 🔍 **Troubleshooting**

### Connection Failed
- Check `NEXT_PUBLIC_USERMAP_SERVER_URL` is set correctly in Vercel
- Verify server is running (check Railway/Render dashboard)
- Check browser console for CORS errors
- Ensure `ALLOWED_ORIGINS` includes your Vercel domain

### Server Not Starting
- Check server logs in Railway/Render dashboard
- Verify `PORT` environment variable is set
- Check that `data/` directory exists (server creates it automatically)

### Messages Not Persisting
- On Railway/Render, the filesystem is ephemeral by default
- Consider upgrading to persistent storage or migrating to a database
- For now, data will persist until server restarts

---

## 💰 **Cost Estimates**

- **Railway**: Free tier (500 hours/month), then $5/month
- **Render**: Free tier (spins down after inactivity), then $7/month
- **Fly.io**: Free tier (3 shared VMs), then pay-as-you-go

For a small project, Railway's free tier should be sufficient!

---

## 🎉 **Once Deployed**

Your community map will work in production! Users can:
- ✅ See all visitor pins
- ✅ Chat in real-time
- ✅ Drop their own pins
- ✅ See message history

