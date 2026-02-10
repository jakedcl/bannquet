# Staging Environment - Quick Setup

## ✅ What I've Done

1. ✅ Created `staging` branch locally
2. ✅ You're currently on the `staging` branch

## 🚀 Next Steps (Do These Now)

### 1. Push Staging Branch to GitHub

```bash
git push -u origin staging
```

### 2. Configure in Vercel Dashboard

1. **Go to your Vercel project:** https://vercel.com/jakedcl/bannquet2
2. **Settings → Git:**
   - Make sure "staging" branch is listed and connected

3. **Settings → Domains:**
   - Click "Add Domain"
   - Enter: `staging.bannquet.com`
   - Select: "Connect to an environment"
   - Environment: **Preview**
   - Branch: **staging**
   - Click "Save"

4. **DNS Configuration:**
   - Vercel will show you DNS instructions
   - Add a CNAME record:
     - Type: `CNAME`
     - Name: `staging`
     - Value: `cname.vercel-dns.com` (or what Vercel shows)
   - Wait 5-15 minutes for DNS to propagate

5. **Environment Variables:**
   - Go to: Settings → Environment Variables
   - For **Preview** environment, add/update:
     - `NEXT_PUBLIC_APP_URL` = `https://staging.bannquet.com`
   - Make sure all other vars (Sanity, Resend, etc.) are also set for Preview

### 3. Test It

After DNS propagates:
- Push to `staging` branch → auto-deploys to `staging.bannquet.com`
- Test on your phone, different browsers, etc.
- When ready, merge to `main` → deploys to `bannquet.com`

## 📋 Workflow

**Testing:**
```bash
git checkout staging
# make changes
git add .
git commit -m "test changes"
git push origin staging
# → deploys to staging.bannquet.com
```

**Production:**
```bash
git checkout main
git merge staging
git push origin main
# → deploys to bannquet.com
```

## 🎯 That's It!

Once you push the branch and configure Vercel, you'll have:
- `staging.bannquet.com` - for testing
- `bannquet.com` - for production

Both auto-deploy when you push to their respective branches!
