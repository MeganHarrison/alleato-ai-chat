# Supabase Auth Migration Plan

> **Created**: August 2025  
> **Status**: Planning Phase  
> **Migration Type**: NextAuth.js → Supabase Auth + Supabase UI

## 📋 Migration Overview

This document outlines the complete migration plan from NextAuth.js to Supabase Auth, including file deletions, modifications, and new implementations.

## 🎯 Migration Goals

1. Replace NextAuth.js with Supabase Auth
2. Use Supabase UI components for authentication forms
3. Maintain existing functionality (including guest users)
4. Update all auth-dependent components and API routes
5. Clean up obsolete files and dependencies

## 📊 Migration Phases

### Phase 1: Setup Supabase Auth (Day 1)
- [ ] Create Supabase project and configure authentication
- [ ] Set up Supabase environment variables
- [ ] Install @supabase/ui-patterns-react package
- [ ] Configure Supabase client instances

### Phase 2: Implement New Auth Pages (Day 1-2)
- [ ] Replace login page with Supabase UI
- [ ] Replace register page with Supabase UI
- [ ] Implement password reset functionality
- [ ] Add email verification flow
- [ ] Handle guest user migration strategy

### Phase 3: Update Components (Day 2-3)
- [ ] Replace useSession with Supabase auth hooks
- [ ] Update auth context providers
- [ ] Modify user navigation components
- [ ] Update auth-dependent UI components

### Phase 4: Migrate API Routes (Day 3-4)
- [ ] Replace server-side auth() calls with Supabase
- [ ] Update API route middleware
- [ ] Modify database queries for new user structure
- [ ] Test all API endpoints

### Phase 5: Cleanup & Testing (Day 4-5)
- [ ] Remove NextAuth.js files
- [ ] Uninstall next-auth package
- [ ] Update documentation
- [ ] Comprehensive testing
- [ ] Deploy to staging

## 🗑️ Files to Delete

### NextAuth Core Files
```
/app/(auth)/auth.ts
/app/(auth)/auth.config.ts
/app/(auth)/api/auth/[...nextauth]/route.ts
/app/(auth)/actions.ts (after extracting non-auth logic)
```

### Auth Components (to be replaced)
```
/components/auth-form.tsx
/app/(auth)/login/page.tsx (replace with Supabase UI)
/app/(auth)/register/page.tsx (replace with Supabase UI)
```

## 📝 Files to Modify

### 1. Environment Variables
```bash
# Remove
AUTH_SECRET=

# Add
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # For server-side operations
```

### 2. Layout Files
**`/app/layout.tsx`**
- Remove `SessionProvider` from next-auth
- Add Supabase auth provider

### 3. Components Using Auth
| Component | Current | Migration |
|-----------|---------|-----------|
| `sidebar-user-nav.tsx` | `useSession()` | `useUser()` from Supabase |
| `chat-header.tsx` | Auth context | Supabase user context |
| `app-sidebar.tsx` | Session check | Supabase auth state |

### 4. API Routes
All routes in `/app/(chat)/api/` need modification:
- Replace `import { auth } from '@/app/(auth)/auth'`
- With Supabase server client: `createServerClient()`

### 5. Server Components
Update auth checks in:
- `/app/(chat)/page.tsx`
- `/app/(chat)/layout.tsx`  
- `/app/(chat)/chat/[id]/page.tsx`

### 6. Database Queries
**`/lib/db/queries.ts`**
- Update `getUser()` to use Supabase user ID
- Modify `createUser()` for Supabase flow
- Adapt `createGuestUser()` strategy

## 🆕 New Implementations

### 1. Supabase Client Setup
```typescript
// /lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 2. Server Client Setup
```typescript
// /lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### 3. Auth Pages with Supabase UI
```typescript
// /app/(auth)/login/page.tsx
import { Auth } from '@supabase/ui-patterns/react/auth'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: 'default' }}
      providers={[]}
      redirectTo="/chat"
      view="sign_in"
    />
  )
}
```

## 🔄 Guest User Strategy

Since Supabase doesn't have built-in guest users, we need a custom approach:

### Option 1: Anonymous Auth (Recommended)
```typescript
// Create anonymous user
const { data, error } = await supabase.auth.signInAnonymously()

// Later convert to permanent account
const { data, error } = await supabase.auth.updateUser({
  email: 'user@example.com',
  password: 'password'
})
```

### Option 2: Custom Guest Implementation
- Create guest users with generated email (e.g., `guest-{uuid}@temp.local`)
- Mark with user metadata: `{ is_guest: true }`
- Provide upgrade path to full account

## 📦 Package Changes

### Remove
```json
{
  "dependencies": {
    "next-auth": "5.0.0-beta.25"
  }
}
```

### Add
```json
{
  "dependencies": {
    "@supabase/ui-patterns": "latest"
  }
}
```

## 🧪 Testing Checklist

### Authentication Flows
- [ ] User registration with email
- [ ] User login with email/password
- [ ] Password reset flow
- [ ] Email verification
- [ ] Guest user creation
- [ ] Guest to registered user conversion
- [ ] Logout functionality

### Protected Routes
- [ ] Redirect to login when unauthenticated
- [ ] Access control for chat routes
- [ ] API route authentication
- [ ] Real-time features with auth

### Data Integrity
- [ ] User data migration
- [ ] Chat ownership preservation
- [ ] Document access control
- [ ] File upload permissions

## 🚀 Deployment Steps

1. **Staging Deployment**
   - Deploy with feature flag: `USE_SUPABASE_AUTH=true`
   - Test all auth flows
   - Monitor for issues

2. **Production Migration**
   - Schedule maintenance window
   - Backup user data
   - Deploy new auth system
   - Monitor error rates

3. **Rollback Plan**
   - Keep NextAuth files in separate branch
   - Feature flag to switch back
   - Database migration scripts ready

## 📚 Documentation Updates

### Update Files
- `/docs/ARCHITECTURE.md` - Remove NextAuth references
- `/docs/QUICK-REFERENCE.md` - Update auth commands
- `/README.md` - Update setup instructions
- `/docs/.env.example` - Update environment variables

### New Documentation
- Supabase auth setup guide
- Guest user documentation
- Migration guide for existing users

## ⚠️ Risk Mitigation

1. **Data Loss Prevention**
   - Backup all user data before migration
   - Test user data migration scripts
   - Maintain audit log of changes

2. **Feature Parity**
   - Ensure guest users work similarly
   - Maintain all existing auth features
   - Test edge cases thoroughly

3. **Performance**
   - Monitor auth latency
   - Check Supabase rate limits
   - Optimize auth checks

## 📅 Timeline

- **Day 1**: Setup & Auth Pages
- **Day 2-3**: Component Migration
- **Day 3-4**: API Route Updates
- **Day 4-5**: Testing & Cleanup
- **Day 6**: Staging Deployment
- **Day 7**: Production Migration

## 🎯 Success Criteria

- [ ] All auth flows working correctly
- [ ] No regression in functionality
- [ ] Improved user experience with Supabase UI
- [ ] Clean codebase without NextAuth remnants
- [ ] Updated and accurate documentation
- [ ] Successful production deployment

---

**Note**: This migration plan should be reviewed and adjusted based on actual implementation progress and any discovered edge cases.