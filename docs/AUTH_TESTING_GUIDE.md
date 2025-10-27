# Authentication Testing Guide

Quick reference for testing auth flows after the session management fixes.

## Quick Console Tests

Open browser console and run these commands to verify auth is working:

### 1. Check Current Session
```javascript
// Import the helper (if not already available)
import { getCurrentSession } from './lib/supabase';

// Check session status
const { session, error } = await getCurrentSession();
console.log('Session:', {
  isAuthenticated: !!session,
  userId: session?.user?.id,
  email: session?.user?.email,
  expiresAt: new Date(session?.expires_at * 1000).toLocaleString(),
  expiresInMinutes: session?.expires_at 
    ? Math.floor((session.expires_at - Date.now() / 1000) / 60)
    : 'N/A',
  error: error?.message
});
```

### 2. Monitor Auth Events
```javascript
// Add this to watch all auth state changes
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  console.log(`[AUTH EVENT] ${event}`, {
    timestamp: new Date().toLocaleTimeString(),
    userId: session?.user?.id,
    email: session?.user?.email,
  });
});

// To stop monitoring:
// subscription.unsubscribe();
```

### 3. Check LocalStorage
```javascript
// View stored auth data
const authData = localStorage.getItem('brickit-auth');
if (authData) {
  const parsed = JSON.parse(authData);
  console.log('Stored Auth:', {
    hasAccessToken: !!parsed.access_token,
    hasRefreshToken: !!parsed.refresh_token,
    expiresAt: new Date(parsed.expires_at * 1000).toLocaleString(),
  });
} else {
  console.log('No auth data in localStorage');
}
```

## Manual Test Scenarios

### Scenario 1: Fresh Sign In
1. Open app in incognito window
2. Click "Login" button
3. Enter email and submit
4. Check email and click magic link
5. ✅ Verify: Redirected to app and logged in
6. ✅ Verify: Can see Profile button
7. ✅ Verify: Can create and save a creation

### Scenario 2: Session Persistence
1. Sign in (see Scenario 1)
2. Refresh the page (F5)
3. ✅ Verify: Still logged in
4. Close browser completely
5. Reopen browser and navigate to app
6. ✅ Verify: Still logged in

### Scenario 3: Session Refresh
1. Sign in (see Scenario 1)
2. In console, check current session expiry time
3. Wait until session should have expired (or mock it)
4. Perform an action that requires auth (e.g., save creation)
5. ✅ Verify: Action succeeds (session auto-refreshed)
6. Check console for `[AuthContext] Auth state changed: TOKEN_REFRESHED`

### Scenario 4: Multiple Tabs
1. Sign in in Tab 1
2. Open app in Tab 2
3. ✅ Verify: Tab 2 shows logged in state
4. Sign out in Tab 1
5. ✅ Verify: Tab 2 also signs out (or refreshes to signed-out state)

### Scenario 5: API Calls with Auth
1. Sign in
2. Open Profile → My Creations
3. ✅ Verify: Creations load successfully
4. Check Network tab for API calls
5. ✅ Verify: Authorization header is present
6. Delete a creation
7. ✅ Verify: Deletion succeeds

### Scenario 6: Error Handling
1. Sign in
2. Open DevTools → Application → LocalStorage
3. Delete the `brickit-auth` key
4. Try to load creations
5. ✅ Verify: User-friendly error message shown
6. ✅ Verify: Console shows proper error logging
7. ✅ Verify: App doesn't crash

## Common Issues to Watch For

### Issue: "No active session" errors
**Symptoms:** Random "No active session. Please sign in again." errors

**Check:**
- Console logs for session retrieval errors
- Network tab for failed auth API calls
- LocalStorage for `brickit-auth` key

**Fix:** Should be resolved by getCurrentSession() helper

---

### Issue: Session not persisting
**Symptoms:** User logged out after refresh

**Check:**
- localStorage has `brickit-auth` key
- Supabase client config has `persistSession: true`
- No browser extensions blocking localStorage

**Fix:** Already configured correctly

---

### Issue: Session not refreshing
**Symptoms:** Errors after ~1 hour of being logged in

**Check:**
- Console for TOKEN_REFRESHED events
- Supabase client config has `autoRefreshToken: true`

**Fix:** Already configured correctly

---

## Debugging Commands

### Force Session Refresh
```javascript
const { data, error } = await supabase.auth.refreshSession();
console.log('Refresh result:', { 
  success: !!data.session,
  error: error?.message 
});
```

### Clear Session (Force Sign Out)
```javascript
await supabase.auth.signOut();
localStorage.removeItem('brickit-auth');
window.location.reload();
```

### Simulate Expired Session
```javascript
// WARNING: This will corrupt your session
const authData = JSON.parse(localStorage.getItem('brickit-auth'));
authData.expires_at = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
localStorage.setItem('brickit-auth', JSON.stringify(authData));
window.location.reload();
```

## Network Tab Checklist

When authenticated, verify these requests include auth:

- ✅ `GET /api/creations` - Authorization header present
- ✅ `POST /api/creations` - Authorization header present
- ✅ `DELETE /api/creations/:id` - Authorization header present
- ✅ `POST /api/storage/upload` - No auth needed (public endpoint)
- ✅ `DELETE /api/storage/:path` - No auth needed (backend handles it)

## PostHog Event Tracking

If PostHog is configured, verify these events fire:

- ✅ `SIGNED_IN` - When user signs in
- ✅ `SIGNED_OUT` - When user signs out
- ✅ `TOKEN_REFRESHED` - When session auto-refreshes (logged only)

## Success Criteria

Your auth is working correctly if:

1. ✅ User can sign in with magic link
2. ✅ Session persists across page refreshes
3. ✅ Session persists across browser restarts
4. ✅ Session auto-refreshes before expiry
5. ✅ API calls include proper authentication
6. ✅ Error messages are clear and helpful
7. ✅ No console errors during normal auth flow
8. ✅ Multi-tab auth state stays synchronized

---

**Last Updated:** October 27, 2025  
**Related:** See [AUTH_SESSION_AUDIT.md](./AUTH_SESSION_AUDIT.md) for technical details

