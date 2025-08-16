# NextAuth Files to Delete

This file contains a comprehensive list of all files that should be deleted after successfully migrating to Supabase Auth.

## ⚠️ WARNING: Only delete these files AFTER confirming Supabase Auth is working correctly!

## 🗑️ Files to Delete Immediately

### Core NextAuth Configuration
```bash
# NextAuth configuration files
rm /app/(auth)/auth.ts
rm /app/(auth)/auth.config.ts

# NextAuth API route
rm -rf /app/(auth)/api/auth/[...nextauth]/

# Guest auth route (if functionality moved to Supabase)
rm /app/(auth)/api/auth/guest/route.ts
```

### Auth Components
```bash
# Auth form component (replaced by Supabase UI)
rm /components/auth-form.tsx

# Old auth pages (replaced by Supabase UI)
rm -rf /app/(auth)/login/
rm -rf /app/(auth)/register/
```

### Server Actions
```bash
# Only if all actions are auth-related
# Otherwise, extract non-auth logic first
rm /app/(auth)/actions.ts
```

## 📝 Files to Clean Up (Remove NextAuth imports/code)

### Package.json
Remove from dependencies:
```json
"next-auth": "5.0.0-beta.25"
```

### Environment Files
Remove from `.env.local` and `.env.example`:
```
AUTH_SECRET=
```

## 🔍 Files Requiring Code Removal

These files contain NextAuth code that needs to be removed but the files themselves should be kept:

### Layout and Providers
- `/app/layout.tsx` - Remove SessionProvider import and wrapper

### Components
- `/components/sidebar-user-nav.tsx` - Remove useSession, signOut imports
- `/components/chat-header.tsx` - Remove auth imports
- `/components/app-sidebar.tsx` - Remove session checks

### API Routes  
All files in `/app/(chat)/api/` - Remove:
```typescript
import { auth } from '@/app/(auth)/auth'
```

### Server Components
- `/app/(chat)/page.tsx` - Remove auth imports
- `/app/(chat)/layout.tsx` - Remove auth imports
- `/app/(chat)/chat/[id]/page.tsx` - Remove auth imports

### Utilities and Tools
- `/lib/db/queries.ts` - Update user queries
- `/lib/ai/tools/*.ts` - Remove auth imports
- `/lib/artifacts/server.ts` - Remove auth imports

## 🧹 Cleanup Commands

After migration is complete and tested:

```bash
# 1. Remove NextAuth package
pnpm remove next-auth

# 2. Delete NextAuth core files
rm -rf /app/(auth)/auth.ts
rm -rf /app/(auth)/auth.config.ts
rm -rf /app/(auth)/api/auth/

# 3. Delete old auth UI files
rm -rf /app/(auth)/login/
rm -rf /app/(auth)/register/
rm /components/auth-form.tsx

# 4. Clean up any remaining imports
# Search for remaining NextAuth references
grep -r "next-auth" --include="*.ts" --include="*.tsx" .
grep -r "NextAuth" --include="*.ts" --include="*.tsx" .
grep -r "@/app/(auth)/auth" --include="*.ts" --include="*.tsx" .

# 5. Remove from git
git add -A
git commit -m "chore: remove NextAuth files after Supabase migration"
```

## ✅ Verification Checklist

Before deleting files, ensure:
- [ ] All authentication flows work with Supabase
- [ ] No TypeScript errors related to missing auth imports
- [ ] All API routes properly authenticated with Supabase
- [ ] Guest user functionality migrated successfully
- [ ] All tests passing
- [ ] Staging environment working correctly
- [ ] Backup of code exists in separate branch

## 🔄 Rollback Strategy

If issues arise after deletion:
```bash
# Restore from git
git checkout previous-branch -- /app/(auth)/
git checkout previous-branch -- /components/auth-form.tsx

# Re-install NextAuth
pnpm add next-auth@5.0.0-beta.25

# Restore environment variables
# Add back AUTH_SECRET to .env.local
```

---

**Remember**: It's better to keep old files temporarily than to delete prematurely. Only proceed with deletion after thorough testing in production.