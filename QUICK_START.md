# 🚀 GensanWorks Next.js Rebuild - QUICK START GUIDE

**Status**: Phase 0 Code Complete ✅ | Ready for Manual Infrastructure Setup

---

## 📋 What's Been Created

A complete Next.js 15 + TypeScript + Tailwind + Supabase project structure with:

- ✅ 14 database tables (Drizzle ORM schema)
- ✅ NextAuth.js v5 authentication framework
- ✅ Landing page and login page
- ✅ UI components (Button, Card)
- ✅ Data export/import scripts (CSV)
- ✅ Environment configuration
- ✅ Documentation (README, setup guides)

**Location**: `d:\My Studies\GensanWorks-Next\`

---

## 🏃 Next Steps (In Order)

### Step 1: Create Supabase Project (30 mins)

Go to **full setup guide**: [PHASE_0_SETUP.md](./PHASE_0_SETUP.md)

Or quick summary:

1. Create account at [supabase.com](https://supabase.com)
2. Create new PostgreSQL project
3. Note your credentials:
   - Project URL
   - Anon Key
   - Service Role Key
   - Database Connection String
4. Get Google OAuth credentials from Google Cloud Console

### Step 2: Create Storage Buckets (10 mins)

In Supabase dashboard → Storage:

1. Create bucket: `resumes`
2. Create bucket: `profile-images`
3. Create bucket: `employer-documents`
4. Create bucket: `job-attachments`

### Step 3: Setup Environment Variables (10 mins)

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local and add values:
# - SUPABASE URLs and keys
# - DATABASE_URL
# - NextAuth secret (generate with: openssl rand -base64 32)
# - Google OAuth credentials
```

### Step 4: Install Dependencies & Setup Database (20 mins)

```bash
# From d:\My Studies\GensanWorks-Next\

# Install packages
npm install

# Create database migrations
npm run db:generate

# Apply migrations to Supabase
npm run db:push
```

Target output:
```
✅ Tables created:
  - admins, users, employers, jobs, applications, referrals
  - messages, notifications, admin_access_requests
  - employer_requirements, job_requirements, skill_suggestions
  - bookmarks, settings
```

### Step 5: Create Admin Account (5 mins)

Go to Supabase dashboard → SQL Editor and run:

```sql
INSERT INTO admins (id, email, name, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@gensanworks.com',
  'System Admin',
  '$2a$10$Y9CzF.3ItL3j.BpV2PW/R.x88L8NrU7PZtj7xM9Kg9K/p7KVEBDey', -- bcrypt hash of "Admin@123456"
  'admin',
  true
);
```

### Step 6: Test Locally (10 mins)

```bash
cd d:\My Studies\GensanWorks-Next

npm run dev
```

- Opens at http://localhost:3000
- Try landing page
- Try login with `admin@gensanworks.com` / `Admin@123456`

### Step 7: Setup Git (5 mins)

```bash
git init
git add .
git commit -m "Phase 0: Initial Next.js project with Drizzle schema and NextAuth setup"
git remote add origin https://github.com/yourusername/GensanWorks-Next.git
git push -u origin main
```

### Step 8: Deploy to Vercel (10 mins)

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Vercel auto-detects Next.js
4. Add environment variables from `.env.local`
5. Deploy

---

## 📂 Key Files You Should Know About

| File | Purpose |
|------|---------|
| `app/db/schema.ts` | All 14 database tables |
| `app/lib/auth.ts` | NextAuth.js configuration |
| `app/lib/constants.ts` | Status workflows, enums, app constants |
| `PHASE_0_SETUP.md` | Detailed infrastructure setup guide |
| `IMPLEMENTATION_STATUS.md` | Progress tracking across all phases |
| `scripts/export-from-old-db.js` | Export data from existing GensanWorks |
| `scripts/import-to-supabase.js` | Import CSV data to Supabase |

---

## 🔄 Data Migration (If You Have Existing Data)

If you want to bring over existing applicants, jobs, employers, applications:

```bash
# Export from old database
npm run migrate:export
# Creates: exports/applicants.csv, exports/employers.csv, etc.

# Import to Supabase
npm run migrate:import
# Validates, normalizes, and inserts all data
```

---

## 📊 What's Ready

✅ **Code & Configuration**
- Next.js 15 with TypeScript
- TailwindCSS with dark mode
- Drizzle ORM with PostgreSQL
- NextAuth.js with email + Google OAuth
- shadcn/ui components

✅ **Documentation**
- README with full overview
- Phase 0 setup guide (detailed walkthrough)
- Implementation status tracker
- Database schema documented

✅ **Development Tools**
- Dev server (`npm run dev`)
- Database migrations (`npm run db:push`)
- Type checking (`npm run type-check`)
- Data export/import scripts

---

## ⏭️ After Phase 0 Complete

Once infrastructure is setup, you can start **Phase 1: Authentication & Core Features**

**Phase 1 tasks** (estimated 1-2 weeks):
- [ ] Jobseeker signup page
- [ ] Employer signup page
- [ ] Profile pages (NSRP + SRS)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Role-based middleware

Then continue with Phases 2-7...

---

## 🆘 Troubleshooting

**Issue**: "DATABASE_URL is not set"
```bash
# Make sure .env.local has DATABASE_URL from Supabase
echo $DATABASE_URL  # Check if set
```

**Issue**: "npm install fails"
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

**Issue**: "Drizzle migrations fail"
```bash
# Make sure Supabase project is running
# Check DATABASE_URL is correct
# Try pulling current schema first:
npm run db:pull
npm run db:push
```

**Issue**: "Google OAuth not working"
- Check Client ID matches in `.env.local` and Google Console
- Verify redirect URI is correct: `http://localhost:3000/api/auth/callback/google`
- Check Google+ API is enabled

---

## 📚 Useful Commands

```bash
# Development
npm run dev              # Start dev server on :3000

# Database
npm run db:generate     # Create migration files
npm run db:push        # Apply migrations
npm run db:pull        # Sync schema from database
npm run db:studio      # Open visual DB editor

# Data Migration
npm run migrate:export  # Export old data to CSV
npm run migrate:import  # Import CSV to Supabase

# Verification
npm run type-check     # Check TypeScript
npm run lint           # Run ESLint

# Build & Deploy
npm run build          # Build for production
npm start              # Run production build locally
```

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth.js**: https://next-auth.js.org
- **Drizzle ORM**: https://orm.drizzle.team
- **Tailwind**: https://tailwindcss.com/docs

---

## ✨ Quick Facts

- **Lines of code**: ~2000 (config, schema, components, docs)
- **Database tables**: 14 (all relationships defined)
- **API endpoints**: 100+ (to be implemented)
- **Authentication methods**: 2 (email/password + Google OAuth)
- **UI components**: 2 (Button, Card) + shadcn/ui library
- **Phases**: 7 (8 weeks estimated with 3-4 devs)

---

## 🎯 Goal

Build a production-ready, scalable job matching platform that migrates from Express + React + SQLite to modern Next.js + Supabase architecture. 

**Phase 0** provides the foundation. **Phases 1-7** build the full platform with all features.

---

**Ready?**

1. Follow [PHASE_0_SETUP.md](./PHASE_0_SETUP.md) for infrastructure
2. Run `npm run dev` to test locally
3. Deploy to Vercel
4. Start Phase 1 development

---

**Last Updated**: March 26, 2026

Good luck! 🚀
