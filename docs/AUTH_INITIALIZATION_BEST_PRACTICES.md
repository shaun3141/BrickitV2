# Authentication Initialization Best Practices

**Date:** January 2025  
**Status:** ✅ Implemented

## Problem Summary

The application was experiencing slow authentication state detection (10-15 seconds) and sometimes failing to recognize active sessions. Users would see a logged-out state initially, even when they had valid sessions.

## Root Cause

The issue was caused by **deadlocks in Supabase's `onAuthStateChange` callback** due to:

1. **Using `async` in the callback** - Making the callback function `async` can cause deadlocks
2. **Performing async operations directly in the callback** - Calling `await supabase.functions.invoke()` or other async Supabase operations inside the callback can cause subsequent Supabase calls to hang indefinitely
3. **Complex race condition handling** - Overly complex logic trying to handle multiple initialization paths

## What We Were Doing Wrong

### ❌ Bad Pattern (Causes Deadlocks)

```typescript
// DON'T DO THIS - Causes deadlocks!
supabase.auth.onAuthStateChange(async (event, session) => {
  // ❌ Async callback
  setSession(session);
  
  if (event === 'SIGNED_IN') {
    // ❌ Async operation directly in callback
    await supabase.functions.invoke('add-user-to-audience', {
      // ...
    });
  }
});
```

**Why this fails:**
- Supabase has a known bug where async operations in `onAuthStateChange` can cause deadlocks
- Subsequent Supabase calls (including `getSession()`) may hang indefinitely
- The callback never fires or fires but blocks other operations

### ❌ Complex Initialization Logic

```typescript
// DON'T DO THIS - Overly complex
useEffect(() => {
  let sessionLoaded = false;
  let timeoutId = null;
  
  // Set up listener first
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Complex race condition handling
    if (sessionLoaded) return;
    sessionLoaded = true;
    // ...
  });
  
  // Fallback with timeout
  setTimeout(() => {
    if (!sessionLoaded) {
      supabase.auth.getSession() // May hang due to deadlock
    }
  }, 500);
}, []);
```

**Why this fails:**
- If `onAuthStateChange` deadlocks, `getSession()` will also hang
- Complex state tracking creates more failure points
- Timeouts don't help if the underlying calls are blocked

## ✅ Correct Pattern

### Recommended Approach (From Supabase Docs)

```typescript
useEffect(() => {
  // Step 1: Get initial session FIRST
  supabase.auth.getSession()
    .then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error loading session:', error);
        setSession(null);
      } else {
        setSession(session);
      }
      setLoading(false);
    })
    .catch((err) => {
      console.error('Failed to get session:', err);
      setSession(null);
      setLoading(false);
    });

  // Step 2: Set up listener for future changes
  // IMPORTANT: Keep callback SYNCHRONOUS
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // ✅ Synchronous state updates
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);

    // ✅ Defer ALL async operations using setTimeout
    setTimeout(() => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Now safe to do async operations
        supabase.functions.invoke('add-user-to-audience', {
          // ...
        })
          .then(({ error }) => {
            if (error) {
              console.warn('Failed to add user to audience:', error);
            }
          })
          .catch((err) => {
            console.warn('Error adding user to audience:', err);
          });
      }
    }, 0); // Defer to next tick
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## Key Best Practices

### 1. ✅ Call `getSession()` First
- This is the recommended pattern from Supabase documentation
- Gets the session immediately on mount
- More reliable than waiting for `onAuthStateChange` to fire

### 2. ✅ Keep `onAuthStateChange` Callback Synchronous
- **Never** use `async` in the callback function signature
- Keep state updates synchronous
- This prevents deadlocks

### 3. ✅ Defer Async Operations
- Wrap any async operations in `setTimeout(..., 0)`
- This moves them to the next event loop tick
- Prevents blocking the callback execution

### 4. ✅ Keep It Simple
- Don't over-engineer race condition handling
- Let `getSession()` handle initial load
- Let `onAuthStateChange` handle future changes
- Simple, straightforward code is more reliable

### 5. ✅ Proper Cleanup
- Always unsubscribe from `onAuthStateChange` in cleanup
- Prevents memory leaks and duplicate listeners

## Implementation in Our Codebase

**File:** `client/src/features/auth/AuthContext.tsx`

The current implementation follows these best practices:
- ✅ Calls `getSession()` first to get initial session
- ✅ Sets up `onAuthStateChange` listener for future changes
- ✅ Keeps callback synchronous
- ✅ Defers async operations (PostHog, Resend audience) using `setTimeout`
- ✅ Proper cleanup on unmount

## References

- [Supabase Auth Sessions Documentation](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Troubleshooting: API Calls Not Returning](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning)
- [GitHub Issue: onAuthStateChange Deadlock](https://github.com/supabase/auth-js/issues/762)

## Related Documentation

- `AUTH_SESSION_AUDIT.md` - Previous session management fixes
- `AUTH_FLOW_AUDIT.md` - Authentication flow audit
- `AUTH_TESTING_GUIDE.md` - Testing authentication flows

