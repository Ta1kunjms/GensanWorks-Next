CREATE TABLE IF NOT EXISTS "admin_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"organization" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	CONSTRAINT "admin_access_requests_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"applicant_id" uuid NOT NULL,
	"employer_id" uuid NOT NULL,
	"applicant_name" varchar(255),
	"applicant_email" varchar(255),
	"cover_letter" text,
	"resume_url" varchar(500),
	"status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"feedback" text,
	"interview_date" timestamp,
	"interview_notes" text,
	"match_score" numeric(5, 2),
	"match_insights" jsonb,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_job_bookmark" UNIQUE("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employer_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"srs_form_submitted" boolean DEFAULT false,
	"business_permit_submitted" boolean DEFAULT false,
	"bir_2303_submitted" boolean DEFAULT false,
	"dole_certification_submitted" boolean DEFAULT false,
	"company_profile_submitted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employer_requirements_employer_id_unique" UNIQUE("employer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"contact_person" varchar(255) NOT NULL,
	"contact_phone" varchar(20) NOT NULL,
	"establishment_name" varchar(255) NOT NULL,
	"industry" varchar(100),
	"company_type" varchar(100),
	"company_size" varchar(50),
	"business_nature" varchar(255),
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"province" varchar(100) NOT NULL,
	"zip_code" varchar(10),
	"logo_url" varchar(500),
	"srs_form_file" varchar(500),
	"business_permit_file" varchar(500),
	"bir_2303_file" varchar(500),
	"dole_certification_file" varchar(500),
	"company_profile_file" varchar(500),
	"account_status" varchar(50) DEFAULT 'pending',
	"verified_at" timestamp,
	"has_account" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"website" varchar(255),
	"description" text,
	"years_in_operation" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"employer_id" uuid NOT NULL,
	"referral_slip_submitted" boolean DEFAULT false,
	"employment_contract_submitted" boolean DEFAULT false,
	"medical_certificate_submitted" boolean DEFAULT false,
	"barangay_clearance_submitted" boolean DEFAULT false,
	"police_clearance_submitted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_requirements_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"position_title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"responsibilities" text,
	"qualifications" text,
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"salary_period" varchar(50),
	"employment_type" varchar(50) NOT NULL,
	"vacancies" integer DEFAULT 1,
	"start_date" timestamp,
	"end_date" timestamp,
	"location" varchar(255) NOT NULL,
	"city" varchar(100),
	"province" varchar(100),
	"is_remote" boolean DEFAULT false,
	"required_skills" jsonb,
	"preferred_skills" jsonb,
	"education_level" varchar(100),
	"years_experience" integer,
	"minimum_age" integer,
	"maximum_age" integer,
	"status" varchar(50) DEFAULT 'draft',
	"archived" boolean DEFAULT false,
	"is_published" boolean DEFAULT false,
	"benefits" jsonb,
	"work_schedule" varchar(255),
	"reporting_to" varchar(255),
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"content" text NOT NULL,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50),
	"type" varchar(50) DEFAULT 'system',
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_id" uuid,
	"related_type" varchar(50),
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"employer_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"application_id" uuid,
	"applicant" varchar(255),
	"employer" varchar(255),
	"vacancy" varchar(255),
	"status" varchar(50) DEFAULT 'Pending',
	"referral_slip_number" varchar(100),
	"peso_officer_name" varchar(255),
	"peso_officer_designation" varchar(255),
	"date_referred" timestamp DEFAULT now() NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"category" varchar(100),
	"frequency" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_suggestions_name_unique" UNIQUE("name"),
	CONSTRAINT "skill_suggestions_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"birth_date" timestamp,
	"gender" varchar(20),
	"profile_image" varchar(500),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"zip_code" varchar(10),
	"employment_status" varchar(50),
	"current_occupation" varchar(255),
	"current_employer" varchar(255),
	"employment_type" varchar(50),
	"education_level" varchar(50),
	"school_name" varchar(255),
	"school_year" varchar(20),
	"skills" jsonb,
	"certifications" text,
	"is_four_ps" boolean DEFAULT false,
	"is_ofw" boolean DEFAULT false,
	"is_pwd" boolean DEFAULT false,
	"pwd_type" varchar(100),
	"preferred_industries" jsonb,
	"preferred_locations" jsonb,
	"salary_expectation" numeric(12, 2),
	"job_search_status" varchar(50),
	"nsrp_id" varchar(50),
	"nsrp_registration_date" timestamp,
	"registration_date" timestamp DEFAULT now(),
	"contact_person" varchar(255),
	"contact_relationship" varchar(100),
	"contact_phone" varchar(20),
	"profile_complete" boolean DEFAULT false,
	"profile_completeness" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nsrp_id_unique" UNIQUE("nsrp_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_access_requests_email" ON "admin_access_requests" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_access_requests_status" ON "admin_access_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admins_email" ON "admins" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_job_id" ON "applications" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_applicant_id" ON "applications" ("applicant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_employer_id" ON "applications" ("employer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "applications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_created_at" ON "applications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookmarks_user_id" ON "bookmarks" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employers_email" ON "employers" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employers_account_status" ON "employers" ("account_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employers_city" ON "employers" ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employers_created_at" ON "employers" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_requirements_job_id" ON "job_requirements" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_employer_id" ON "jobs" ("employer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_location" ON "jobs" ("location");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_created_at" ON "jobs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_is_published" ON "jobs" ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_sender_id" ON "messages" ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_recipient_id" ON "messages" ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications" ("read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referrals_applicant_id" ON "referrals" ("applicant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referrals_employer_id" ON "referrals" ("employer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referrals_job_id" ON "referrals" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referrals_status" ON "referrals" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referrals_created_at" ON "referrals" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_suggestions_normalized_name" ON "skill_suggestions" ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_employment_status" ON "users" ("employment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_is_ofw" ON "users" ("is_ofw");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_is_four_ps" ON "users" ("is_four_ps");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employer_requirements" ADD CONSTRAINT "employer_requirements_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
