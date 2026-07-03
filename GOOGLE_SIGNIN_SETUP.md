# Google Sign-In Setup Guide

## Overview
This guide will help you set up Google OAuth 2.0 authentication for the NegaritAI application.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project selector at the top
3. Click "New Project"
4. Enter a project name (e.g., "NegaritAI")
5. Click "Create"
6. Wait for the project to be created (may take a few minutes)

### 2. Enable Google+ API

1. In the Cloud Console, search for "Google+ API" in the search bar
2. Select "Google+ API" from the results
3. Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. If prompted, click "Configure OAuth Consent Screen" first
4. Choose "External" user type
5. Fill in the OAuth Consent Screen:
   - **App name**: NegaritAI
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click "Save and Continue"
6. Skip scopes and optional info (click "Save and Continue")
7. Back to creating credentials:
   - **Application type**: Web application
   - **Name**: NegaritAI Frontend
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/login` (for development)
     - `https://yourdomain.com/login` (for production)
   - Click "Create"

### 4. Copy Your Client ID

1. On the credentials page, find your newly created OAuth client
2. Click the copy icon next to "Client ID"
3. Save it somewhere safe - you'll need it in the next step

### 5. Configure Environment Variables

#### Frontend Configuration

Create or update `frontend/.env.local`:

```bash
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=paste_your_client_id_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Important**: Never commit `.env.local` to version control!

#### Backend Configuration (Optional for development)

If you want to verify tokens on the backend, create or update `backend/.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=paste_your_client_id_here
GOOGLE_CLIENT_SECRET=paste_your_client_secret_here
```

**Note**: Client secret should only be used on the backend, never in frontend code.

### 6. Restart Your Application

1. Stop the frontend development server (Ctrl+C)
2. Restart it:
   ```bash
   npm run dev
   ```

## Testing

1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected to the dashboard if successful

## Common Issues

### Error: "Missing required parameter: client_id"
- **Cause**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` environment variable is not set
- **Fix**: Add your Client ID to `frontend/.env.local` and restart the dev server

### Error: "The redirect URI does not match"
- **Cause**: The redirect URI in Google Cloud Console doesn't match your application URL
- **Fix**: Add your application URL to "Authorized redirect URIs" in Google Cloud Console

### Error: "This app isn't verified by Google"
- **Cause**: Your app is in development and not verified
- **Fix**: 
  - For development: This is normal, click "Continue" on the warning
  - For production: Submit your app for verification in the OAuth Consent Screen

### Google button doesn't show
- **Cause**: Network issues or script not loading
- **Fix**: 
  - Check browser console for errors
  - Ensure NEXT_PUBLIC_GOOGLE_CLIENT_ID is set
  - Clear browser cache and restart dev server

## Deployment Configuration

### For Vercel/Netlify (Frontend)

1. Go to your deployment platform dashboard
2. Add environment variables:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your production Client ID
   - `NEXT_PUBLIC_API_URL`: Your backend URL

### For Backend Deployment

1. In your hosting platform, set environment variables:
   - `GOOGLE_CLIENT_ID`: Your Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Client Secret
   - `CORS_ORIGIN`: Your frontend URL

### Update Google Cloud Console

1. Add your production URLs to Google Cloud Console:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/login`

## Security Best Practices

1. **Never commit secrets**: Keep `.env.local` and `.env` in `.gitignore`
2. **Use different credentials**: Use separate OAuth credentials for development and production
3. **Restrict origins**: In production, only allow your domain in the OAuth settings
4. **Rotate secrets**: Periodically rotate your Client Secret
5. **HTTPS only**: Always use HTTPS in production
6. **Token validation**: Always verify tokens on the backend

## User Data Handling

When a user signs in with Google, we receive:
- Name
- Email
- Profile picture URL

This data is:
- Stored locally in localStorage
- Sent to the backend for verification
- Used to create/update user account

## Troubleshooting

### Check if Google script is loaded
Open browser console and run:
```javascript
console.log(window.google);
// Should return an object, not undefined
```

### Check environment variables
In frontend, run:
```javascript
console.log(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
// Should show your Client ID
```

### Verify token on backend
Check backend logs for token verification attempts:
```javascript
// Look for success/failure messages
```

## Support

If you encounter issues:
1. Check the console for error messages
2. Review the [Google Identity Services documentation](https://developers.google.com/identity/gsi/web)
3. Verify all environment variables are set correctly
4. Ensure your OAuth credentials are properly configured

## Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
