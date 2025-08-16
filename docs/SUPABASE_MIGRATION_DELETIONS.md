# Supabase Migration - Files Deleted

This document tracks all files that have been deleted as part of the Supabase Auth migration.

## ✅ Files Successfully Deleted

### 1. Old Auth Pages (Replaced by Supabase UI)
- ✅ `/app/(auth)/login/` - Old NextAuth login page
- ✅ `/app/(auth)/register/` - Old NextAuth register page

### 2. Old Auth Components
- ✅ `/components/auth-form.tsx` - Old authentication form component
- ✅ `/components/sign-out-form.tsx` - Old sign-out form using NextAuth

### 3. Auth Actions
- ✅ `/app/(auth)/actions.ts` - Server actions for NextAuth login/register
- ✅ `/app/(auth)/api/auth/guest/route.ts` - Guest authentication route

### 4. Backend Auth Files (Using Supabase Instead)
- ✅ `/alleato-backend/src/routes/auth.ts` - Workers auth routes
- ✅ `/alleato-backend/src/services/auth.ts` - Workers auth service
- ✅ `/alleato-backend/src/middleware/auth.ts` - Workers auth middleware

## ❌ Files That CANNOT Be Deleted Yet

These files still have dependencies and need to be migrated first:

### NextAuth Core Files
- `/app/(auth)/auth.ts` - Main NextAuth configuration
- `/app/(auth)/auth.config.ts` - NextAuth config
- `/app/(auth)/api/auth/[...nextauth]/route.ts` - NextAuth API route

### Why They Can't Be Deleted
1. **14 API routes** still import from `@/app/(auth)/auth`
2. **11 components** still use NextAuth hooks (`useSession`, `signOut`)
3. **app/layout.tsx** still wraps the app with `SessionProvider`

## 📋 Next Steps Before Full Deletion

1. **Update all API routes** in `/app/(chat)/api/`:
   - Replace `import { auth } from '@/app/(auth)/auth'`
   - Use Supabase server client for authentication

2. **Update all components**:
   - Replace `useSession()` with Supabase's `useUser()`
   - Update sign-out functionality to use Supabase

3. **Update app/layout.tsx**:
   - Remove `SessionProvider` wrapper
   - Add Supabase auth provider if needed

4. **Remove package**:
   - Run `pnpm remove next-auth`

## 📊 Deletion Summary

- **Total Files Deleted**: 8
- **Frontend Auth Files**: 5
- **Backend Auth Files**: 3
- **Files Remaining**: 3 (NextAuth core files)

## 🗓️ Deletion Date

All deletions performed on: **August 15, 2025**

---

**Note**: The NextAuth core files will be deleted once all dependencies are migrated to Supabase.