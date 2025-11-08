# Google OAuth Setup Guide (FREE)

Google Sign-In is **completely free** to use. Follow these simple steps to set it up:

## Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Dharani Snap")
4. Click "Create"

### Step 2: Enable Google Sign-In API
1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"Google Identity Services"**
3. Click on it and click **"Enable"**

### Step 3: Create OAuth 2.0 Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (for personal use)
   - App name: **Dharani Snap**
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"** through the steps
4. For OAuth client ID:
   - Application type: **Web application**
   - Name: **Dharani Snap Web Client**
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `http://localhost:8000` (if using port 8000)
     - Add your production domain if deploying
   - Authorized redirect URIs: (can leave empty for Google Sign-In)
   - Click **"Create"**

### Step 4: Copy Your Client ID
1. A popup will show your **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
2. Copy this Client ID

### Step 5: Configure in Your App
1. Open your browser's **Developer Console** (F12)
2. Go to the **Console** tab
3. Run this command (replace with your actual Client ID):
   ```javascript
   localStorage.setItem('GOOGLE_CLIENT_ID', 'your-client-id-here.apps.googleusercontent.com')
   ```
4. Refresh the login/signup page
5. The Google Sign-In button should now appear!

## Alternative: Set Client ID Directly in Code

If you prefer to set it directly in code:

1. Open `own2/public/auth.js`
2. Find the line: `let GOOGLE_CLIENT_ID = localStorage.getItem('GOOGLE_CLIENT_ID');`
3. Replace it with:
   ```javascript
   let GOOGLE_CLIENT_ID = 'your-client-id-here.apps.googleusercontent.com';
   ```

## Testing

1. Go to your login or signup page
2. You should see the Google Sign-In button
3. Click it and sign in with your Google account
4. You'll be redirected to the appropriate dashboard!

## Important Notes

- **It's FREE**: Google OAuth is completely free for unlimited users
- **No credit card required**: You don't need to provide payment information
- **Development**: Works perfectly for localhost development
- **Production**: Just add your production domain to "Authorized JavaScript origins"

## Troubleshooting

### Button not showing?
- Check browser console for errors
- Make sure you've set the Client ID correctly
- Verify the Google Identity Services script is loading

### "Error 400: redirect_uri_mismatch"?
- Make sure you added `http://localhost:3000` (or your port) to Authorized JavaScript origins
- Check for typos in the origin URL

### "Invalid client" error?
- Verify your Client ID is correct
- Make sure the OAuth consent screen is configured
- Check that Google+ API is enabled

## Support

For more help, visit:
- [Google Identity Documentation](https://developers.google.com/identity/gsi/web)
- [Google Cloud Console Help](https://cloud.google.com/docs)

---

**Enjoy your free Google OAuth integration!** 🎉




