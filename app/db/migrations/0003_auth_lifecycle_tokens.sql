CREATE TABLE IF NOT EXISTS "auth_lifecycle_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(32) NOT NULL,
	"role" varchar(50) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_lifecycle_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_lifecycle_tokens_kind_role_user" ON "auth_lifecycle_tokens" ("kind", "role", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_lifecycle_tokens_expires_at" ON "auth_lifecycle_tokens" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" varchar(50) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"verified_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_role_user_verification" UNIQUE("role", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_email_verifications_email" ON "account_email_verifications" ("email");
