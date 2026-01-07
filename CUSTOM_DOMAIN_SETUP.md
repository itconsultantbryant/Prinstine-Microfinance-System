# Custom Domain Setup Guide for Render

This guide explains how to configure your Prinstine Microfinance application to work with a custom domain from Namecheap on Render.

## Overview

Since the frontend is served from the backend (single service), both frontend and backend will use the same custom domain.

## Step 1: Configure Custom Domain in Render

1. Go to your Render dashboard
2. Select your `microfinance-backend` service
3. Go to **Settings** → **Custom Domains**
4. Add your custom domain (e.g., `app.yourdomain.com` or `yourdomain.com`)
5. Follow Render's instructions to add the DNS records in Namecheap

## Step 2: DNS Configuration in Namecheap

In your Namecheap DNS settings, add:

### For Root Domain (yourdomain.com):
- **Type**: CNAME
- **Host**: @
- **Value**: Your Render service URL (e.g., `microfinance-backend-xxxx.onrender.com`)

### For Subdomain (app.yourdomain.com):
- **Type**: CNAME
- **Host**: app (or your preferred subdomain)
- **Value**: Your Render service URL (e.g., `microfinance-backend-xxxx.onrender.com`)

**Note**: Render will provide the exact CNAME value when you add the custom domain.

## Step 3: Environment Variables (Optional)

If you want to explicitly set your custom domain, you can add it to `render.yaml`:

```yaml
envVars:
  - key: CUSTOM_DOMAIN
    value: "yourdomain.com"  # or "app.yourdomain.com"
```

However, this is **optional** because:
- The frontend uses relative URLs (same domain) by default in production
- CORS is set to allow all origins (`CORS_ORIGIN: "*"`)
- Render automatically provides `RENDER_EXTERNAL_URL` and `RENDER_EXTERNAL_HOSTNAME`

## Step 4: Verify Configuration

After setting up the custom domain:

1. Wait for DNS propagation (can take up to 48 hours, usually much faster)
2. Check that your custom domain resolves to your Render service
3. Test the application:
   - Visit `https://yourdomain.com` (or your subdomain)
   - Try logging in
   - Verify API calls work (check browser console)

## How It Works

### Frontend API Configuration
- **Development**: Uses `http://localhost:5000`
- **Production**: Uses relative URLs (empty string) - automatically uses the same domain
- **Custom**: Can set `VITE_API_URL` environment variable if needed

### CORS Configuration
- Allows all origins when `CORS_ORIGIN="*"` (current setting)
- Automatically includes Render URLs
- Can add custom domain via `CUSTOM_DOMAIN` env var if needed

### Single Service Architecture
Since both frontend and backend are served from the same service:
- No CORS issues (same origin)
- Simpler configuration
- Single SSL certificate from Render

## Troubleshooting

### Issue: API calls failing
**Solution**: Check that `VITE_API_URL` is not set (or is empty) in production. The frontend should use relative URLs.

### Issue: CORS errors
**Solution**: The current configuration allows all origins. If you see CORS errors, check:
1. `CORS_ORIGIN` is set to `"*"` in render.yaml
2. Custom domain is properly configured in Render

### Issue: SSL/HTTPS not working
**Solution**: Render automatically provisions SSL certificates for custom domains. Wait a few minutes after adding the domain.

## Current Configuration

✅ Frontend uses relative URLs in production (same domain)
✅ CORS allows all origins
✅ Render URLs automatically included
✅ Custom domain support ready

No additional configuration needed! Just add your custom domain in Render and configure DNS in Namecheap.

