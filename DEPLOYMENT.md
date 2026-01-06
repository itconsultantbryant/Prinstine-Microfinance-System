# Deployment Guide for Render

This guide will help you deploy the Microfinance Management System to Render.

## Prerequisites

1. A GitHub account with the repository pushed
2. A Render account (sign up at https://render.com)
3. PostgreSQL database (provided by Render)

## Deployment Steps

### 1. Database Setup

1. Go to your Render dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `microfinance-db`
   - **Database**: `microfinance`
   - **User**: `microfinance_user`
   - **Region**: Oregon (or your preferred region)
   - **Plan**: Free (or upgrade as needed)
4. Note the **Internal Database URL** and **External Connection String**

### 2. Backend Service Setup

1. In Render dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the backend service:
   - **Name**: `microfinance-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or Free for testing)

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=5000
   DB_DIALECT=postgres
   DB_URL=<Internal Database URL from step 1>
   JWT_SECRET=<Generate a strong random string>
   CORS_ORIGIN=https://microfinance-frontend.onrender.com
   FRONTEND_URL=https://microfinance-frontend.onrender.com
   ```

5. **Disk** (for file uploads):
   - **Name**: `microfinance-uploads`
   - **Mount Path**: `/opt/render/project/src/backend/uploads`
   - **Size**: 1GB

6. Click "Create Web Service"

### 3. Frontend Service Setup

1. In Render dashboard, click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `microfinance-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     ```
     VITE_API_URL=https://microfinance-backend.onrender.com
     ```

4. Click "Create Static Site"

### 4. Database Migration

After the backend service is deployed:

1. Go to the backend service in Render
2. Open the "Shell" tab
3. Run:
   ```bash
   npm run migrate
   npm run seed
   ```

### 5. Update CORS

Once both services are deployed:

1. Get the frontend URL from Render (e.g., `https://microfinance-frontend.onrender.com`)
2. Update the backend service's `CORS_ORIGIN` environment variable to include the frontend URL
3. Redeploy the backend service

## Environment Variables Reference

### Backend (.env)

```env
NODE_ENV=production
PORT=5000
DB_DIALECT=postgres
DB_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-frontend-url.onrender.com
FRONTEND_URL=https://your-frontend-url.onrender.com
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

## Using render.yaml (Alternative Method)

If you prefer using the `render.yaml` file:

1. Push the `render.yaml` file to your repository
2. In Render dashboard, click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect and use the `render.yaml` file
5. Review and deploy the services

## Post-Deployment

### 1. Verify Services

- Backend health check: `https://microfinance-backend.onrender.com/health`
- Frontend: `https://microfinance-frontend.onrender.com`

### 2. Test Login

- Use default admin credentials:
  - Email: `admin@microfinance.com`
  - Password: `admin123`

### 3. Update Admin Password

**IMPORTANT**: Change the default admin password immediately after first login!

## Troubleshooting

### Backend Issues

1. **Database Connection Errors**:
   - Verify `DB_URL` is set correctly
   - Check database is running
   - Ensure SSL is enabled for PostgreSQL

2. **CORS Errors**:
   - Verify `CORS_ORIGIN` includes your frontend URL
   - Check `FRONTEND_URL` is set correctly

3. **File Upload Issues**:
   - Verify disk is mounted correctly
   - Check uploads directory permissions

### Frontend Issues

1. **API Connection Errors**:
   - Verify `VITE_API_URL` points to your backend URL
   - Check backend service is running
   - Ensure CORS is configured correctly

2. **Build Errors**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json

## Monitoring

- Use Render's built-in logs to monitor service health
- Set up alerts for service failures
- Monitor database usage and upgrade plan if needed

## Security Notes

1. **Never commit `.env` files** to Git
2. **Use strong JWT_SECRET** in production
3. **Enable HTTPS** (automatic on Render)
4. **Regularly update dependencies**
5. **Change default admin password** immediately

## Support

For Render-specific issues, check:
- Render Documentation: https://render.com/docs
- Render Status: https://status.render.com

