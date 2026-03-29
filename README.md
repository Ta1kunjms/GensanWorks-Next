# GensanWorks - Next.js Rebuild

A comprehensive job matching platform rebuilt with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

This is a phased rebuild of GensanWorks, transitioning from Express + React (Vite) to modern Next.js architecture with serverless deployment.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase account (free tier available)
- Google OAuth credentials (optional)

### 1. Clone & Install

```bash
git clone <repo-url>
cd GensanWorks-Next
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

**Critical environment variables:**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=postgresql://user:password@host:5432/db

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Auth lifecycle emails
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=no-reply@your-domain.com

# Account deletion processor (optional cron protection)
ACCOUNT_DELETION_CRON_SECRET=strong-random-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
```

### 3. Database Setup

**Phase 0 - Manual Supabase Setup:**

1. Create a PostgreSQL project in Supabase dashboard
2. Get connection string from Settings → Database
3. Set `DATABASE_URL` in `.env.local`
4. Create S3 storage buckets:
   - `resumes`
   - `profile-images`
   - `employer-documents`
   - `job-attachments`

**Run migrations:**

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automation Gates

```bash
# environment and core validation
npm run validate:env
npm run verify:core

# security and reliability checks
npm run security:secrets:scan
npm run test:security
npm run test:load:smoke
```

See docs index: `docs/README.md`.

## 📁 Project Structure

```
app/
├── api/                  # API routes (100+ endpoints)
│   ├── auth/            # Authentication endpoints
│   ├── jobs/            # Job CRUD operations
│   ├── applications/    # Application endpoints
│   ├── admin/           # Admin-only routes
│   ├── employer/        # Employer routes
│   └── ...
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── providers.tsx    # Client providers
│   └── ...
├── db/
│   ├── schema.ts        # Drizzle ORM schema (14 tables)
│   └── migrations/      # Auto-generated SQL migrations
├── lib/
│   ├── auth.ts          # NextAuth.js configuration
│   ├── db.ts            # Drizzle connection
│   ├── supabase.ts      # Supabase client setup
│   ├── utils.ts         # Shared utilities
│   └── ...
├── (admin)/             # Admin dashboard layout group
├── (employer)/          # Employer portal layout group
├── (jobseeker)/         # Jobseeker portal layout group
└── layout.tsx           # Root layout
```

## 🗄️ Database Schema

### Core Tables (14 total)

- **admins** - System administrators
- **users** - Jobseeker profiles (NSRP)
- **employers** - Employer/establishment info (SRS Form 2)
- **jobs** - Job postings (SRS Form 2A)
- **applications** - Job applications with status workflow
- **referrals** - PESO referral slips
- **messages** - In-app messaging
- **notifications** - System notifications
- **admin_access_requests** - Admin account requests
- **employer_requirements** - Compliance document tracking
- **job_requirements** - Job compliance document tracking
- **skill_suggestions** - Skill catalog
- **bookmarks** - Saved jobs/applicants
- **settings** - Application configuration

### Key Features

- Full NSRP profile fields for jobseekers
- SRS Form 2 & 2A integration for employers
- Status workflow: pending → reviewed → shortlisted → interview → hired
- AI-powered job matching via Groq LLM
- PESO officer tracking & referral slip generation
- Profile completeness scoring

## 🔐 Authentication

### Methods

1. **Email/Password** - Traditional login with role-based access
2. **Google OAuth** - One-click signup/login with auto-account creation
3. **Multi-role support** - Admin, Employer, Jobseeker

### Roles & Access Control

```
Admin:
  - Dashboard with analytics & charts
  - User & employer management
  - Job approval/rejection workflows
  - Settings & OAuth configuration
  - Access request approval

Employer:
  - Job posting & management
  - Application review & status updates
  - Referral slip generation
  - Company profile & compliance docs

Jobseeker:
  - Browse & apply for jobs
  - Profile management (NSRP)
  - Application tracking
  - Bookmarks & saved jobs
  - AI job recommendations
```

## 📊 API Endpoints (100+)

### Authentication (7 endpoints)

- `POST /api/auth/signup/jobseeker`
- `POST /api/auth/signup/employer`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

### Jobs (15+ endpoints)

- `GET /api/jobs` - Public job listing
- `POST /api/jobs` - Create job (admin)
- `GET /api/jobs/[id]`
- `PUT /api/jobs/[id]`
- `DELETE /api/jobs/[id]`
- `PATCH /api/jobs/[id]/archive`
- `POST /api/jobs/[id]/apply` - Apply for job
- `GET /api/jobs/[id]/match` - AI job matching

### Applications (5 endpoints)

- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/[id]`
- `PUT /api/applications/[id]` - Update status
- `DELETE /api/applications/[id]`

### And more...

See `MIGRATION_GUIDE.md` for complete endpoint mapping.

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Environment variables will be managed in Vercel dashboard.

### Self-Hosted

```bash
npm run build
npm start
```

Set all environment variables before starting.

## 🔄 Data Migration (Phase 0)

### Export from Old System

```bash
npm run migrate:export
```

This creates CSV files:
- `exports/applicants.csv`
- `exports/employers.csv`
- `exports/jobs.csv`
- `exports/applications.csv`
- `exports/referrals.csv`

### Import to Supabase

```bash
npm run migrate:import
```

The script will:
1. Validate data integrity
2. Normalize dates and enums
3. Insert into Supabase PostgreSQL
4. Create referential integrity constraints

## 📝 Environment Variables Reference

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL          # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Public anon key
SUPABASE_SERVICE_ROLE_KEY         # Admin key (server-only)
DATABASE_URL                      # PostgreSQL connection string

# NextAuth.js
NEXTAUTH_URL                      # App URL (http://localhost:3000 for dev)
NEXTAUTH_SECRET                   # Generate: openssl rand -base64 32
AUTH_SECRET                       # Optional alias; same value as NEXTAUTH_SECRET

# OAuth Providers
GOOGLE_CLIENT_ID                  # From Google Cloud Console
GOOGLE_CLIENT_SECRET              # From Google Cloud Console

# External Services
RESEND_API_KEY                    # Email service
TWILIO_ACCOUNT_SID               # SMS service
TWILIO_AUTH_TOKEN                # SMS auth token
TWILIO_PHONE_NUMBER              # Twilio sender number
GROQ_API_KEY                     # AI job matching

# Analytics
NEXT_PUBLIC_POSTHOG_API_KEY      # Event tracking

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_MATCHING   # Enable AI matching (true/false)
NEXT_PUBLIC_ENABLE_REALTIME      # Enable WebSocket (true/false)
NEXT_PUBLIC_ENABLE_PWA           # Enable PWA (true/false)

# App Settings
NEXT_PUBLIC_APP_NAME             # "GensanWorks"
NEXT_PUBLIC_APP_URL              # Production URL
NODE_ENV                         # "development" or "production"
```

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Auth smoke checks (runtime)
npm run auth:smoke

# Bootstrap missing role passwords
npm run auth:bootstrap-passwords

# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📚 Documentation

- [API Documentation](./docs/API.md) - Detailed endpoint specs
- [Database Schema](./docs/DATABASE.md) - Tables & relationships
- [Authentication Guide](./docs/AUTH.md) - Login flows
- [Migration Guide](./docs/MIGRATION.md) - From Express to Next.js

## 🗓️ Implementation Phases

### Phase 0 (Week 1) ✅ In Progress
- [x] Project setup & config files
- [x] Drizzle schema creation
- [ ] Data export/import scripts
- [ ] Supabase project setup

### Phase 1 (Weeks 1-2)
- [ ] NextAuth.js configuration
- [ ] Auth routes & pages
- [ ] Database migrations
- [ ] User signup/login flows

### Phase 2 (Week 2)
- [ ] Admin dashboard
- [ ] Job management endpoints
- [ ] Settings & configuration UI

### Phase 3 (Week 3)
- [ ] Jobseeker portal
- [ ] Job browse & search
- [ ] Application workflow

### Phase 4 (Week 3-4)
- [ ] Employer portal
- [ ] Application review UIs
- [ ] Status update workflows

### Phase 5 (Week 4)
- [ ] Real-time notifications
- [ ] Messaging system
- [ ] Email/SMS integration

### Phase 6 (Week 5)
- [ ] Analytics dashboards
- [ ] AI job matching
- [ ] Referral system

### Phase 7 (Week 5-6)
- [ ] Testing & QA
- [ ] PWA setup
- [ ] Mobile optimization
- [ ] Deployment

## 📦 Key Dependencies

- **next** 15.0.0 - React framework
- **next-auth** 5.0.0-beta - Authentication
- **drizzle-orm** 0.29.0 - ORM
- **@supabase/supabase-js** 2.38.0 - Supabase client
- **tailwindcss** 3.3.0 - Styling
- **@radix-ui** - UI primitives
- **shadcn/ui** - Component library
- **zod** 3.22.0 - Validation
- **@tanstack/react-query** 5.28.0 - Data fetching

## 🤝 Contributing

1. Create feature branch: `git checkout -b feat/feature-name`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feat/feature-name`
4. Submit pull request

## 📞 Support

- **Issues**: Report bugs on GitHub
- **Discussions**: Feature requests & ideas
- **Email**: support@gensanworks.com

## 📄 License

MIT License - see LICENSE file

## 🎯 Roadmap

### Phase 2 (Post-Launch)

- [ ] Video interview integration (Zoom/Twilio)
- [ ] Advanced AI resume screening
- [ ] Bulk hiring workflows
- [ ] Email/SMS template builder
- [ ] Webhook system
- [ ] Two-factor authentication
- [ ] Audit logging
- [ ] React Native mobile app

---

**Status**: 🏗️ **Under Active Development** (Phase 0-1)

Last updated: March 2026
