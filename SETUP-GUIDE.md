# ACP Lending Admin Panel Setup Guide

This guide walks you through setting up the no-code admin panel for editing your website content.

## Files Created

- `admin/index.html` - Admin panel UI (at acp-lending.com/admin)
- `admin/config.yml` - Admin panel configuration
- `content/settings.json` - Your website's editable settings
- `js/dynamic-content.js` - Script that loads settings on your pages
- `worker/oauth-proxy.js` - Cloudflare Worker for GitHub authentication
- `wrangler.toml` - Cloudflare Workers configuration

## Setup Steps (6 steps)

### Step 1: Add the Script to Your HTML Pages

Add this line before `</body>` on each page that should use dynamic content:

```html
<script src="/js/dynamic-content.js" defer></script>
```

This loads your settings and updates contact info, social links, and navigation across your site.

### Step 2: Create a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: ACP Lending Admin
   - **Homepage URL**: https://acp-lending.com
   - **Authorization callback URL**: https://your-worker-url.workers.dev/callback
4. Click "Create application"
5. Copy your `Client ID` and `Client Secret`

### Step 3: Deploy the OAuth Worker to Cloudflare

**Option A: Via Cloudflare Dashboard**

1. Go to https://dash.cloudflare.com
2. Select your account, then Workers
3. Click "Create Service"
4. Name it `acp-lending-oauth`
5. Copy the code from `worker/oauth-proxy.js` into the editor
6. Replace `YOUR_GITHUB_CLIENT_ID` and `YOUR_GITHUB_CLIENT_SECRET` with values from Step 2
7. Click "Deploy"
8. Your worker URL will be like: `https://acp-lending-oauth.your-account.workers.dev`

**Option B: Via Command Line**

```bash
npm install -g @cloudflare/wrangler
wrangler login
wrangler publish worker/oauth-proxy.js
```

### Step 4: Update Configuration Files

In `admin/config.yml`, replace:
```yml
oauth_worker_url: "https://your-worker-url.workers.dev"
```

In `admin/index.html`, find this line:
```javascript
const oauthUrl = 'https://your-worker-url.workers.dev/oauth';
```

Replace with your actual Cloudflare Worker URL from Step 3.

In `worker/oauth-proxy.js`, make sure the `REDIRECT_URI` matches:
```javascript
const REDIRECT_URI = 'https://your-worker-url.workers.dev/callback';
```

### Step 5: Set Up GitHub Pages Deployment (Optional)

If you're using GitHub Pages:

1. The `content/settings.json` file will auto-deploy with every push
2. No additional setup needed—changes deploy automatically in 1-2 minutes

### Step 6: Visit Your Admin Panel

1. Go to https://acp-lending.com/admin
2. Click "Sign in with GitHub"
3. Authorize the app to access your repo
4. Edit your settings in the form
5. Click "Save Changes"
6. Your site updates automatically in 1-2 minutes

## Using the Admin Panel

Once set up, the admin panel lets you edit:

- **Phone Number** - Updates wherever you use `[data-content="phone"]`
- **Email Address** - Updates wherever you use `[data-content="email"]`
- **Social Media URLs** - Facebook, LinkedIn, Instagram, YouTube
- **Navigation Links** - Customize your site's navigation menu

## How It Works

1. **Admin Panel** reads from your GitHub repo
2. **OAuth Worker** handles GitHub login securely
3. **Settings File** (`content/settings.json`) stores your data
4. **Dynamic Script** (`js/dynamic-content.js`) applies settings to your pages
5. **Cloudflare Pages** auto-deploys changes in 1-2 minutes

## Troubleshooting

**"Sign in with GitHub" doesn't work**
- Verify the OAuth Worker URL in `admin/index.html` is correct
- Check that your GitHub OAuth App callback URL matches your Worker URL

**Changes don't show up**
- Wait 2 minutes for Cloudflare Pages to deploy
- Clear your browser cache (Ctrl+Shift+Del)
- Check that the script tag is on your page

**Admin panel won't load settings**
- Make sure `content/settings.json` exists in your repo
- Check browser console for errors (F12 → Console)
- Verify the path `/content/settings.json` is correct

## Security Notes

- Your GitHub token is stored in the browser's localStorage
- Only you (logged in as your GitHub account) can edit
- The OAuth Worker is read-only for settings—it doesn't modify your repo directly

## Next Steps

Once you've set it up:
- Visit acp-lending.com/admin to start editing
- Test by changing your phone number
- Watch your site update automatically
- No code required from here on out
