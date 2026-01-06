# Quick Start Guide for Render Deployment

## Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub** (already done)

2. **Go to Render Dashboard**:
   - Visit https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Review and Deploy**:
   - Review the services (backend, frontend, database)
   - Click "Apply"
   - Render will create all services automatically

4. **Set Environment Variables**:
   After services are created, update:
   - Backend → Environment → `CORS_ORIGIN`: Add your frontend URL
   - Backend → Environment → `FRONTEND_URL`: Add your frontend URL
   - Frontend → Environment → `VITE_API_URL`: Should auto-populate

5. **Run Database Migration**:
   - Go to Backend service → Shell
   - Run: `npm run migrate && npm run seed`

## Option 2: Manual Setup

### Step 1: Create Database

1. New + → PostgreSQL
2. Name: `microfinance-db`
3. Plan: Free
4. Copy the **Internal Database URL**

### Step 2: Create Backend Service

1. New + → Web Service
2. Connect GitHub repo
3. Settings:
   - **Name**: `microfinance-backend`
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=5000
   DB_DIALECT=postgres
   DB_URL=<Internal Database URL>
   JWT_SECRET=<Generate random string>
   CORS_ORIGIN=https://microfinance-frontend.onrender.com
   FRONTEND_URL=https://microfinance-frontend.onrender.com
   ```

5. **Add Disk**:
   - Name: `microfinance-uploads`
   - Mount: `/opt/render/project/src/backend/uploads`
   - Size: 1GB

### Step 3: Create Frontend Service

1. New + → Static Site
2. Connect GitHub repo
3. Settings:
   - **Name**: `microfinance-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://microfinance-backend.onrender.com
   ```

### Step 4: Update CORS

After both services are deployed:

1. Get frontend URL from Render
2. Update backend `CORS_ORIGIN` environment variable
3. Redeploy backend

## Important URLs

After deployment, you'll get:
- Backend: `https://microfinance-backend.onrender.com`
- Frontend: `https://microfinance-frontend.onrender.com`

## Default Login

- Email: `admin@microfinance.com`
- Password: `admin123`

**⚠️ Change this password immediately after first login!**

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify `DB_URL` is set correctly
- Ensure database is running

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set to backend URL
- Check CORS settings in backend
- Ensure backend service is running

### Database connection errors
- Verify `DB_URL` uses internal connection string
- Check database is running
- Ensure SSL is enabled (automatic on Render)

## Next Steps

1. ✅ Services deployed
2. ✅ Database migrated
3. ✅ Test login
4. ⚠️ Change admin password
5. ⚠️ Configure custom domain (optional)
6. ⚠️ Set up monitoring alerts

