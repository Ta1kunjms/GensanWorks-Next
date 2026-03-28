# Phase 0: Infrastructure & Project Setup

Complete guide to setting up all infrastructure for GensanWorks Next.js rebuild.

## 🗓️ Estimated Time: 3-4 hours

This phase sets up the foundation that all other phases depend on.

---

## Step 1: Create Supabase Project

### 1.1 Create Account & Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" (sign up if needed)
3. Create organization
4. Create new project:
   - **Name**: `GensanWorks`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient for development

### 1.2 Wait for Project Setup

- Supabase will provision PostgreSQL database
- This takes 1-2 minutes
- You'll see "Your project is ready" when complete

### 1.3 Configure Authentication

1. Go to Authentication → Providers
2. Enable Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or use existing
   - Go to Credentials → Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`, `https://yourdomain.com` (add later)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`, `https://yourdomain.com/api/auth/callback/google`
   - Copy Client ID and Client Secret
   - Paste into Supabase Auth settings

### 1.4 Get Connection Credentials

1. Go to Settings → Database
2. Copy these values:
   - **Connection string**: `postgresql://postgres:PASSWORD@host:5432/postgres`
   - **Project URL**: From main dashboard
   - **Anon Key**: From Settings → API
   - **Service Role Key**: From Settings → API (keep secret, server-only)

---

## Step 2: Create Storage Buckets

Storage buckets are S3-compatible buckets for file uploads.

### 2.1 Create Buckets

In Supabase dashboard:

1. Go to **Storage** → **Buckets**
2. Create 4 buckets:

#### Bucket 1: `resumes`
- **Public**: No (private, authenticated only)
- **Purpose**: User resumes/CVs

#### Bucket 2: `profile-images`
- **Public**: Yes (for avatars in listings)
- **Purpose**: User and employer profile photos

#### Bucket 3: `employer-documents`
- **Public**: No (private)
- **Purpose**: SRS forms, business permits, BIR, DOLE certs

#### Bucket 4: `job-attachments`
- **Public**: No (private)
- **Purpose**: Job description attachments, job postings PDFs

### 2.2 Configure Bucket Policies

For **profile-images** (public):

1. Click bucket name
2. Go to Policies
3. Add new policy:

```sql
-- Allow public read
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'profile-images'
);
```

For **resumes**, **employer-documents**, **job-attachments** (private):

```sql
-- Allow read only own files
CREATE POLICY "Allow users to read own files"
ON storage.objects FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'current_bucket'
  AND auth.uid()::text = owner
);

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'current_bucket'
);
```

---

## Step 3: Setup Environment Variables

### 3.1 Local Development

```bash
# Create .env.local in project root
cp .env.example .env.local
```

Add these values to `.env.local`:

```env
# From Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key

# PostgreSQL Connection (from Settings → Database)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[RANDOM].supabase.co:5432/postgres

# NextAuth.js (generate SECRET with: openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional - Add Later
RESEND_API_KEY=your-resend-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
GROQ_API_KEY=your-groq-api-key
NEXT_PUBLIC_POSTHOG_API_KEY=your-posthog-key
```

### 3.2 Production Settings (Vercel)

Store these as environment variables in Vercel dashboard (no `.env.local`):

1. Go to Vercel dashboard → Project settings → Environment Variables
2. Add all variables above
3. Set for Production environment only initially

---

## Step 4: Install Dependencies

```bash
npm install

# This installs all packages including:
# - Next.js 15
# - NextAuth.js v5
# - Drizzle ORM
# - Supabase client
# - TailwindCSS
# - shadcn/ui components
# - Everything else
```

---

## Step 5: Database Setup

### 5.1 Run Drizzle Migrations

First, create Drizzle migration files:

```bash
npm run db:generate
```

This creates migration SQL files in `app/db/migrations/`

Then apply migrations to Supabase:

```bash
npm run db:push
```

If you already applied earlier schemas, also ensure these SQL migrations are applied:

```sql
-- app/db/migrations/0001_notifications_user_id_actor_scope.sql
-- app/db/migrations/0002_messages_actor_scope.sql
```

These make notification and messaging recipient IDs role-agnostic for admin/employer/jobseeker realtime features.

This will:
1. Connect to Supabase using DATABASE_URL
2. Create all 14 tables
3. Create indexes and constraints
4. Create foreign key relationships

**Expected output:**
```
✅ Tables created:
  - admins
  - users
  - employers
  - jobs
  - applications
  - referrals
  - messages
  - notifications
  - admin_access_requests
  - employer_requirements
  - job_requirements
  - skill_suggestions
  - bookmarks
  - settings
```

### 5.2 Verify Database

Go to Supabase dashboard → Table Editor → Should see all 14 tables listed

---

## Step 6: Data Migration (Optional)

If migrating from existing GensanWorks:

### 6.1 Export Old Data

```bash
npm run migrate:export
```

This creates CSV files in `exports/` directory:
- `applicants.csv`
- `employers.csv`
- `jobs.csv`
- `applications.csv`
- `referrals.csv`

### 6.2 Import to Supabase

```bash
npm run migrate:import
```

This will:
1. Read CSV files
2. Normalize data (dates, enums, JSON)
3. Insert into Supabase tables
4. Verify data integrity
5. Report final counts

**Expected output:**
```
✅ Imported 40 users
✅ Imported 5 employers
✅ Imported 120 jobs
✅ Imported 500 applications
✅ Imported 150 referrals
```

---

## Step 7: Create Initial Admin Account

### 7.1 Create Admin via Database

Since signup endpoints aren't built yet, create admin directly in Supabase:

1. Go to Supabase dashboard → SQL Editor
2. Run this SQL:

```sql
-- Insert admin user
INSERT INTO admins (id, email, name, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@gensanworks.com',
  'Admin User',
  '$2a$10$...',  -- bcrypt hash of password "Admin@123456"
  'admin',
  true
);

-- Use this Python script to generate bcrypt hash:
-- import bcrypt
-- bcrypt.hashpw(b'Admin@123456', bcrypt.gensalt()).decode()
```

Or use a bash script:

```bash
# Generate bcrypt hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@123456', 10, (err, hash) => console.log(hash));"
```

Then run SQL with hash.

---

## Step 8: Local Development Setup

### 8.1 Start Dev Server

```bash
npm run dev
```

Server runs on [http://localhost:3000](http://localhost:3000)

### 8.2 Test Connection

1. Open [http://localhost:3000](http://localhost:3000)
2. See landing page
3. Click "Login" → Try login with admin@gensanworks.com

### 8.3 Install Drizzle Studio (Optional)

For visualizing database:

```bash
npm run db:studio
```

Opens Studio at [http://localhost:54321](http://localhost:54321) to view/edit data directly.

---

## Step 9: Setup Git & Version Control

```bash
# Initialize if not already done
git init

# Add to .gitignore (already included)
node_modules/
.env.local
.env.*.local
dist/
.next/
uploads/

# Commit
git add .
git commit -m "Phase 0: Project setup with Next.js, Supabase, Drizzle"

# Add remote (if using GitHub)
git remote add origin https://github.com/yourusername/GensanWorks-Next.git
git push -u origin main
```

---

## Step 10: Vercel Deployment Setup

### 10.1 Connect GitHub

1. Go to [https://vercel.com](https://vercel.com)
2. Import project from GitHub
3. Vercel automatically detects Next.js

### 10.2 Add Environment Variables

In Vercel Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
NEXTAUTH_URL (set to your production URL after deployment)
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### 10.3 Deploy

```bash
git push  # Vercel auto-deploys on push
```

Or click "Deploy" in Vercel dashboard.

---

## Verification Checklist

- [ ] Supabase project created and running
- [ ] PostgreSQL database connected
- [ ] 4 storage buckets created
- [ ] Google OAuth credentials obtained and configured
- [ ] Environment variables set in `.env.local`
- [ ] Dependencies installed (`npm install`)
- [ ] Drizzle migrations applied (`npm run db:push`)
- [ ] All 14 database tables exist in Supabase
- [ ] Data imported (if migrating) via `npm run migrate:import`
- [ ] Initial admin account created
- [ ] Local dev server starts (`npm run dev`)
- [ ] Landing page loads at `http://localhost:3000`
- [ ] Login page accessible at `http://localhost:3000/login`
- [ ] Git repository initialized and pushed
- [ ] Vercel project connected and deployed

---

## Troubleshooting

### Issue: "DATABASE_URL" environment variable is not set

**Solution:**
```bash
echo $DATABASE_URL  # Check if var is set

# If not set:
export DATABASE_URL="postgresql://..."

# Or add to .env.local
SUPABASE_SERVICE_ROLE_KEY=...
```

### Issue: "Drizzle migrations failed" / "table already exists"

**Solution:**
This is normal if running `db:push` multiple times.

```bash
# Check current schema
npm run db:pull

# If you need to reset (development only):
# Drop all tables in Supabase SQL editor, then:
npm run db:push
```

### Issue: "Connection timeout" / "Cannot connect to database"

**Solution:**
1. Verify DATABASE_URL is correct
2. Check Supabase project is running (dashboard shows green status)
3. Check network connectivity
4. Try from different network (not behind restrictive firewall)

### Issue: Google OAuth credentials not working

**Solution:**
1. Verify Client ID matches in `.env.local` and Google Console
2. Check authorized redirect URIs include `http://localhost:3000/api/auth/callback/google`
3. Ensure "Google+ API" is enabled in Google Cloud Console

---

## Next Steps

Once Phase 0 is complete:

1. **Phase 1**: Setup NextAuth.js & auth routes → Implement login/signup
2. **Phase 2**: Admin dashboard & job management
3. **Phase 3**: Jobseeker portal
4. **Phase 4**: Employer portal
5. **Phase 5**: Real-time features
6. **Phase 6**: Analytics & AI matching
7. **Phase 7**: Testing & deployment

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Drizzle Docs](https://orm.drizzle.team)
- [Tailwind Docs](https://tailwindcss.com/docs)

---

## Support

- **Supabase Support**: https://supabase.com/support
- **Next.js Discord**: https://discord.gg/bUG7V7Zng6
- **NextAuth.js Discussions**: https://github.com/nextauthjs/next-auth/discussions
- **Project Issues**: GitHub issues

---

**Created**: March 2026  
**Status**: Active Development  
**Next Review**: When Phase 1 completes
