# Authentication Flow Audit

**Date:** October 27, 2025  
**Project:** BrickIt V2  
**Scope:** Frontend-Backend Authentication & Authorization

---

## Executive Summary

This audit examines how the frontend authenticates with the backend and how the backend validates those requests. The system uses a **mixed authentication approach** with some **critical security vulnerabilities** identified.

### 🔴 Critical Issues Found
1. **Storage uploads have NO authentication** - Anyone can upload files to any path
2. **Creation save/update endpoints bypass auth validation** - userId accepted from client
3. **Edge Functions have NO authentication validation** - Public endpoints with no auth checks

### 🟡 Moderate Issues Found  
1. Mixed use of service role and user tokens creates confusion
2. Inconsistent authentication patterns across endpoints

---

## Architecture Overview

### Authentication Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │         │   Supabase   │
│   (Client)   │ ──────> │   Express    │ ──────> │   Database   │
└──────────────┘         └──────────────┘         └──────────────┘
      │                         │                        │
      │ JWT Access Token        │ Service Role Key       │
      │ (via Supabase SDK)      │ (bypasses RLS)         │
      │                         │                        │
      └─────────────────────────┴────────────────────────┘
```

### Key Components

1. **Frontend Auth**: Supabase JS SDK with magic link (OTP) authentication
2. **Backend Auth**: Express server using Supabase service role key
3. **Database Security**: Row Level Security (RLS) policies on tables
4. **Storage Security**: RLS policies on storage bucket (bypassed by service role)

---

## Detailed Analysis by Component

### 1. Frontend Authentication (`AuthContext.tsx`)

**How it works:**
- Uses Supabase JS SDK with anon key (`VITE_SUPABASE_ANON_KEY`)
- Magic link (email OTP) authentication
- Session stored in localStorage (`brickit-auth` key)
- Auto-refresh token enabled
- Auth state listener tracks changes

**Token Management:**
```typescript
// Session stored in localStorage
persistSession: true
storageKey: 'brickit-auth'
storage: window.localStorage
autoRefreshToken: true
```

**Strengths:**
- ✅ Proper session management with auto-refresh
- ✅ PostHog user tracking on sign-in
- ✅ Auth state listener pattern
- ✅ Secure magic link flow

**Weaknesses:**
- ⚠️ No token validation before API calls
- ⚠️ No retry logic on token expiration

---

### 2. Frontend API Calls (`creationService.ts`, `storage.ts`)

#### 2.1 Authenticated Endpoints (Good)

**GET/DELETE `/api/creations`** ✅
```typescript
const response = await fetch(`${API_URL}/api/creations`, {
  method: 'GET/DELETE',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});
```
- **Properly includes JWT token**
- Backend validates token
- User ID extracted from token

#### 2.2 Unauthenticated Endpoints (Bad)

**POST `/api/creations`** 🔴 CRITICAL
```typescript
const response = await fetch(`${API_URL}/api/creations`, {
  method: 'POST',
  body: JSON.stringify({
    userId,  // ⚠️ Sent from client, NOT validated!
    creationData,
    creationId
  }),
});
```
- **No Authorization header**
- **UserId from client, not token**
- Anyone can save creations as any user!

**POST `/api/storage/upload`** 🔴 CRITICAL
```typescript
const response = await fetch(`${API_URL}/api/storage/upload`, {
  method: 'POST',
  body: formData,  // ⚠️ No auth at all!
});
```
- **No authentication whatsoever**
- Anyone can upload to any path
- Can overwrite other users' files!

---

### 3. Backend Validation (`server/src/index.ts`)

#### 3.1 Auth Helper Function

```typescript
async function getUserFromAuthHeader(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !supabase) return null;
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}
```

**How it works:**
- Extracts JWT from `Authorization: Bearer <token>` header
- Validates token with Supabase auth API
- Returns user ID if valid, null otherwise

**Strengths:**
- ✅ Uses Supabase SDK to validate tokens
- ✅ Proper error handling

**Weaknesses:**
- ⚠️ No rate limiting on validation attempts
- ⚠️ No caching of validated tokens

#### 3.2 Endpoint Security Analysis

| Endpoint | Auth Required | Validation | Vulnerability |
|----------|--------------|------------|---------------|
| `GET /api/creations` | ✅ Yes | Token validated, userId from token | None |
| `POST /api/creations` | 🔴 No | **None!** userId from request body | **CRITICAL** - Impersonation possible |
| `DELETE /api/creations/:id` | ✅ Yes | Token validated, userId from token | None |
| `POST /api/storage/upload` | 🔴 No | **None!** No auth check | **CRITICAL** - Unrestricted uploads |
| `POST /api/create-checkout-session` | ⚠️ No | None, but userId is metadata only | Minor - could fake donations |
| `POST /api/webhooks/stripe` | ✅ Yes | Webhook signature validation | None |

#### 3.3 Critical Code Vulnerabilities

**Vulnerability #1: Creation Save Endpoint**
```typescript:178:188:server/src/index.ts
app.post('/api/creations', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { userId, creationData, creationId } = req.body;

    if (!userId || !creationData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
```

**Problem:** UserId comes from request body, not validated token!

**Attack vector:**
```javascript
// Attacker can save creations as ANY user
fetch('https://brickit.build/api/creations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'victim-user-id',  // Can be ANY user ID!
    creationData: { /* malicious data */ }
  })
});
```

**Vulnerability #2: Storage Upload Endpoint**
```typescript:102:142:server/src/index.ts
app.post('/api/storage/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { path: filePath, upsert } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No file path provided' });
    }

    // Upload to Supabase Storage using service role (bypasses RLS)
    const { data, error } = await supabase.storage
      .from('creation-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: upsert === 'true',
      });
```

**Problem:** No authentication check at all!

**Attack vector:**
```javascript
// Attacker can upload to ANY path, even other users' folders
const formData = new FormData();
formData.append('file', maliciousFile);
formData.append('path', 'victim-user-id/profile.png');  // Overwrite victim's files!
formData.append('upsert', 'true');

fetch('https://brickit.build/api/storage/upload', {
  method: 'POST',
  body: formData  // No auth needed!
});
```

---

### 4. Supabase Edge Functions

#### 4.1 `add-user-to-audience` Function 🔴 CRITICAL

```typescript:18:28:supabase/functions/add-user-to-audience/index.ts
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
```

**Problem:** 
- Accepts CORS from anywhere (`*`)
- No authentication validation
- Called from client with user data (lines 66-82 of `AuthContext.tsx`)

**Attack vector:**
```javascript
// Anyone can call this to spam the email list
fetch('https://YOUR_SUPABASE_URL/functions/v1/add-user-to-audience', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'fake-id',
    email: 'victim@example.com',  // Add anyone to audience!
    firstName: 'Spam',
    lastName: 'Bot'
  })
});
```

#### 4.2 `send-donation-email` Function 🔴 CRITICAL

```typescript:14:24:supabase/functions/send-donation-email/index.ts
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
```

**Problem:**
- Called from backend (line 448-475 of `server/src/index.ts`) but endpoint is public!
- Only validated in backend context (webhook), but endpoint is exposed

**Mitigation:** This is actually called from backend after webhook validation, so lower risk.

---

### 5. Database Row Level Security (RLS)

#### Creations Table Policies ✅

```sql:20:53:supabase/migrations/002_create_creations_table.sql
-- Enable Row Level Security
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own creations
CREATE POLICY "Users can view their own creations"
  ON public.creations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view public creations
CREATE POLICY "Anyone can view public creations"
  ON public.creations
  FOR SELECT
  USING (is_public = true);

-- Users can insert their own creations
CREATE POLICY "Users can insert their own creations"
  ON public.creations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own creations
CREATE POLICY "Users can update their own creations"
  ON public.creations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own creations
CREATE POLICY "Users can delete their own creations"
  ON public.creations
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Good news:** RLS policies are well-defined and secure.

**Bad news:** Backend uses service role key which **bypasses all RLS policies**!

#### Storage Bucket Policies ✅

```sql:29:71:supabase/migrations/011_storage_policies.sql
-- Create simple, secure policies
-- Users can only upload files to their own folder (userId/*)
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Everyone (authenticated or not) can view files
-- This allows public sharing of creations
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'creation-images');
```

**Good news:** Storage policies properly restrict uploads/updates/deletes to user's own folder.

**Bad news:** Backend bypasses these with service role key!

---

## Security Issues Summary

### 🔴 Critical (Immediate Action Required)

1. **POST `/api/creations` - Unauthenticated Creation Save**
   - **Risk:** Anyone can create/update creations as any user
   - **Impact:** Data integrity, user impersonation
   - **Fix:** Add token validation, extract userId from token

2. **POST `/api/storage/upload` - Unauthenticated File Upload**
   - **Risk:** Anyone can upload files to any path
   - **Impact:** Storage abuse, file overwrites, cost exploitation
   - **Fix:** Add token validation, enforce userId path prefix

3. **Edge Function `add-user-to-audience` - No Auth**
   - **Risk:** Email list spam, API abuse
   - **Impact:** Email reputation, Resend API costs
   - **Fix:** Validate Supabase JWT token in edge function

### 🟡 Moderate (Should Address Soon)

4. **Edge Function CORS Too Permissive**
   - **Risk:** Called from any origin
   - **Impact:** Potential abuse if functions are discovered
   - **Fix:** Restrict CORS to known origins only

5. **Service Role Key Bypasses All Security**
   - **Risk:** If backend is compromised, all security is bypassed
   - **Impact:** Complete database access
   - **Fix:** Use anon key + RLS where possible, service role only when needed

6. **No Rate Limiting**
   - **Risk:** API abuse, DDoS
   - **Impact:** Performance, costs
   - **Fix:** Implement rate limiting middleware

### 🟢 Low (Minor Improvements)

7. **Checkout Session Metadata Not Validated**
   - **Risk:** Fake userId in donation metadata
   - **Impact:** Analytics/attribution only (payment still valid)
   - **Fix:** Validate userId if provided

8. **No Token Caching**
   - **Risk:** Performance impact from repeated validation
   - **Impact:** Slower responses
   - **Fix:** Cache validated tokens with short TTL

---

## Recommended Fixes

### Fix #1: Secure Creation Endpoints

**Current Code:**
```typescript
app.post('/api/creations', async (req: Request, res: Response) => {
  const { userId, creationData, creationId } = req.body;
  // ... uses userId from request body
});
```

**Fixed Code:**
```typescript
app.post('/api/creations', async (req: Request, res: Response) => {
  // Validate auth token
  const userId = await getUserFromAuthHeader(req.headers.authorization);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { creationData, creationId } = req.body;
  // ... use userId from token
});
```

### Fix #2: Secure Storage Endpoint

**Current Code:**
```typescript
app.post('/api/storage/upload', upload.single('file'), async (req: Request, res: Response) => {
  const { path: filePath, upsert } = req.body;
  // ... uploads to any path
});
```

**Fixed Code:**
```typescript
app.post('/api/storage/upload', upload.single('file'), async (req: Request, res: Response) => {
  // Validate auth token
  const userId = await getUserFromAuthHeader(req.headers.authorization);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { path: filePath, upsert } = req.body;
  
  // Enforce userId path prefix
  if (!filePath.startsWith(`${userId}/`)) {
    return res.status(403).json({ error: 'Cannot upload to this path' });
  }
  
  // ... proceed with upload
});
```

### Fix #3: Secure Edge Functions

**Current Code:**
```typescript
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') { /* ... */ }
  
  const { userId, email } = await req.json();
  // ... no validation
});
```

**Fixed Code:**
```typescript
serve(async (req: Request) => {
  // Validate JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.replace('Bearer ', '');
  
  // Verify JWT with Supabase
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Use verified user.id instead of userId from request
  const { email } = await req.json();
  
  // ... proceed with verified user.id
});
```

### Fix #4: Update Frontend to Send Tokens

**Update `creationService.ts`:**
```typescript
export async function saveCreation(
  userId: string,
  data: SaveCreationData,
  creationId?: string
): Promise<{ data: Creation | null; error: Error | null }> {
  // Get auth token
  const { session } = await getCurrentSession();
  if (!session) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const response = await fetch(`${API_URL}/api/creations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,  // Add token!
    },
    body: JSON.stringify({
      // Remove userId from body - backend will get it from token
      creationData,
      creationId,
    }),
  });
  // ...
}
```

**Update `storage.ts`:**
```typescript
export async function uploadFile(
  file: File | Blob,
  path: string,
  options?: { upsert?: boolean; contentType?: string; }
): Promise<string> {
  // Get auth token
  const { session } = await getCurrentSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  formData.append('upsert', options?.upsert ? 'true' : 'false');
  
  const response = await fetch(`${API_URL}/api/storage/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,  // Add token!
    },
    body: formData,
  });
  // ...
}
```

---

## Testing Recommendations

### Security Tests to Implement

1. **Test: Unauthorized Creation Access**
```bash
# Should fail without token
curl -X POST https://brickit.build/api/creations \
  -H "Content-Type: application/json" \
  -d '{"userId":"victim-id","creationData":{...}}'
```

2. **Test: User Isolation**
```bash
# User A should not be able to access User B's creations
curl -X GET https://brickit.build/api/creations \
  -H "Authorization: Bearer <user-a-token>"
```

3. **Test: Path Traversal Prevention**
```bash
# Should fail to upload to another user's folder
curl -X POST https://brickit.build/api/storage/upload \
  -H "Authorization: Bearer <user-a-token>" \
  -F "file=@test.png" \
  -F "path=user-b-id/malicious.png"
```

4. **Test: Token Expiration**
```bash
# Should fail with expired token
curl -X GET https://brickit.build/api/creations \
  -H "Authorization: Bearer <expired-token>"
```

---

## Implementation Priority

### Phase 1: Critical Security Fixes (Do Immediately)
- [ ] Fix POST `/api/creations` to validate tokens
- [ ] Fix POST `/api/storage/upload` to validate tokens and enforce paths
- [ ] Update frontend to send auth tokens on all authenticated endpoints

### Phase 2: Edge Function Security (Do This Week)
- [ ] Add JWT validation to `add-user-to-audience` edge function
- [ ] Restrict CORS to known origins only
- [ ] Make edge function calls authenticated from frontend

### Phase 3: Additional Security (Do This Month)
- [ ] Implement rate limiting middleware
- [ ] Add token caching for performance
- [ ] Implement request logging for security auditing
- [ ] Add integration tests for auth flows

### Phase 4: Architecture Improvements (Future)
- [ ] Consider using Supabase RLS with anon key instead of service role where possible
- [ ] Implement API gateway with centralized auth middleware
- [ ] Add OAuth providers (Google, GitHub) for easier login

---

## Conclusion

Your authentication system has a solid foundation with Supabase JWT tokens and RLS policies, but **critical implementation gaps** create severe security vulnerabilities. The main issue is inconsistent authentication enforcement - some endpoints properly validate tokens while others accept user IDs from request bodies or have no authentication at all.

**The good news:** These are all straightforward fixes that maintain your current architecture while closing security holes.

**The bad news:** Until fixed, your application is vulnerable to:
- User impersonation
- Unauthorized data access
- Storage abuse
- Email list spam

**Recommendation:** Implement Phase 1 fixes immediately before any further feature development.

