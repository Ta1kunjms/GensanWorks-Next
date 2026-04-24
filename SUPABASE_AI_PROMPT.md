# Supabase AI Support Prompt

## Database Connection Timeout Issue - GensanWorks-Next

### Quick Summary
My Next.js 15 application cannot connect to Supabase PostgreSQL database. All queries timeout after 30-60 seconds. Authentication works (no DB required), but all database operations fail.

---

## Detailed Context

### Project Information
- **Supabase Project ID**: `tsvioxrlmcsqdricdgkd`
- **Region**: `ap-northeast-2` (AWS Singapore)
- **Database Host**: `aws-1-ap-northeast-2.pooler.supabase.com:6543`
- **Connection Pool**: Enabled (using pooler, not direct connection)

### Application Stack
- **Framework**: Next.js 15.5.14
- **ORM**: Drizzle ORM 0.29.0
- **Database Driver**: @neondatabase/serverless (edge-compatible)
- **TypeScript**: Strict mode enabled
- **Auth**: NextAuth.js v5 (works fine, no DB required)
- **Deployment Target**: Vercel (serverless)

---

## The Problem

### Error Message
```
CONNECT_TIMEOUT: Connection timeout at aws-1-ap-northeast-2.pooler.supabase.com:6543
HTTP 500 after 30-60 seconds
```

### Affected Operations
- `npm run db:push` — Hangs indefinitely (Drizzle migrations)
- `npm run db:pull` — Hangs indefinitely (Drizzle schema introspection)
- All API routes requiring database queries
- Direct psql connection also times out

### What Works
- ✅ Web dashboard access (supabase.com)
- ✅ NextAuth.js authentication endpoints (no DB dependency)
- ✅ Network connectivity to `aws-1-ap-northeast-2.supabase.co`
- ✅ `.env.local` configured with DATABASE_URL from dashboard
- ✅ TypeScript compilation and Next.js build

---

## Configuration Details

### Environment Setup
```bash
# From Supabase Dashboard > Project Settings > Database > Connection Pooler
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?schema=public"

# Verified:
- URL is copied exactly from dashboard
- Port 6543 (pooler port, not 5432)
- Schema is 'public'
- Password contains special characters (URL-encoded)
```

### Troubleshooting Already Performed
- ✅ Verified `.env.local` has correct DATABASE_URL
- ✅ Confirmed Supabase project accessible in dashboard
- ✅ Checked local network can reach `aws-1-ap-northeast-2.supabase.co`
- ✅ Verified no firewall blocks outbound 6543
- ✅ Tested with latest Drizzle ORM and PG drivers
- ✅ Confirmed connection pooler setting in dashboard
- ✅ Ran `npm run diagnose:db` (custom diagnostic script) — shows timeout
- ✅ Attempted direct psql — also times out

---

## Specific Questions for Support

1. **Database Status**
   - Is the database instance automatically paused after inactivity?
   - How do I check/resume a paused database via CLI/API?
   - Should I see a "Resume" button in the dashboard if paused?

2. **Connection Pooler**
   - Is the pooler working correctly for ap-northeast-2 region?
   - Should I use direct connection (port 5432) instead of pooler (port 6543)?
   - Are there known issues with connection pooler + Drizzle ORM?

3. **Regional Support**
   - Is ap-northeast-2 fully supported for new projects?
   - Are there any known connectivity issues in this region?
   - Would switching to a different region fix this?

4. **Credentials & Auth**
   - Should I regenerate database password/role?
   - Do I need to create a separate role for applications?
   - Are there IP whitelist settings I should check?

5. **Configuration**
   - What are recommended connection timeout values for Next.js?
   - Should I add `connect_timeout=10` to CONNECTION_URL?
   - Is there a recommended Drizzle ORM config for Supabase?

---

## Expected Resolution

**Desired Outcome**: `npm run db:push` completes in <5 seconds and applies migrations successfully.

**Timeline**: Need this working within next 30 minutes if possible.

**Fallback**: If Supabase cannot be restored, I can switch to a different PostgreSQL provider temporarily to unblock development.

---

## Additional Resources Provided

- **Diagnostic Script**: `scripts/diagnose-db-connection.js`
- **Error Logs**: Available in terminal history (see context)
- **Project Docs**: `PHASE_1_9_BLOCKER_REPORT.md` (contains full troubleshooting details)
- **System Status**: `IMPLEMENTATION_STATUS.md` (explains why this is critical)

---

## How to Use This Prompt

**Option 1: Supabase Dashboard Chat**
1. Go to https://app.supabase.com
2. Click Help icon (bottom right)
3. Paste this entire prompt into the chat
4. Send and wait for response

**Option 2: Supabase Discord**
1. Join #help channel: https://discord.supabase.com
2. Post the "Quick Summary" section
3. Mention this is a connection pooler + Drizzle ORM issue

**Option 3: Email Support**
- Email this file to support@supabase.com with subject: `[URGENT] CONNECT_TIMEOUT on ap-northeast-2 connection pooler`

**Option 4: GitHub Issue**
- If it's a known bug: https://github.com/supabase/supabase/issues

---

**Generated**: April 16, 2026  
**Project**: GensanWorks-Next (Next.js 15 + Drizzle + Supabase)  
**Blocker Status**: Production/development blocked until resolved
